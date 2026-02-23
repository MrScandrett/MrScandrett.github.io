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
const DATA_DIR = path.join(PORTAL_DIR, "data");
const WORK_DIR = path.join(PORTAL_DIR, "work");
const UPLOADS_DIR = path.join(PORTAL_DIR, "uploads");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PENDING_FILE = path.join(DATA_DIR, "pending_users.json");
const HUB_DATA_FILE = path.join(ROOT_DIR, "data", "projects.json");
const PUBLISH_SCRIPT = path.join(ROOT_DIR, "publish_to_pages.js");

const ADMIN_USER = process.env.ADMIN_USER || "Champion";
const ADMIN_PASS = process.env.ADMIN_PASS || "CPA";
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || "";
const GITHUB_OWNER = process.env.GITHUB_OWNER || "MrScandrett";
const REPO_PREFIX = process.env.REPO_PREFIX || "student-showcase-";
const DEFAULT_VISIBILITY = (process.env.DEFAULT_VISIBILITY || "public").toLowerCase();

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

const sessions = new Map();

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(path.join(ROOT_DIR, "assets", "thumbs"), { recursive: true });
  fs.mkdirSync(path.join(ROOT_DIR, "assets", "heroes"), { recursive: true });

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
  }
  if (!fs.existsSync(PENDING_FILE)) {
    fs.writeFileSync(PENDING_FILE, JSON.stringify({ requests: [] }, null, 2));
  }
  if (!fs.existsSync(HUB_DATA_FILE)) {
    fs.mkdirSync(path.dirname(HUB_DATA_FILE), { recursive: true });
    fs.writeFileSync(HUB_DATA_FILE, JSON.stringify({ projects: [] }, null, 2));
  }

  if (!fs.existsSync(PUBLISH_SCRIPT)) {
    throw new Error(`Missing publish script at ${PUBLISH_SCRIPT}`);
  }
}

function now() {
  return Date.now();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[key] = value;
  });
  return cookies;
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
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

function parseUrlEncoded(bodyBuffer) {
  const out = {};
  const text = bodyBuffer.toString("utf8");
  text.split("&").forEach((part) => {
    if (!part) return;
    const idx = part.indexOf("=");
    const key = idx === -1 ? part : part.slice(0, idx);
    const rawValue = idx === -1 ? "" : part.slice(idx + 1);
    out[decodeURIComponent(key.replace(/\+/g, " "))] = decodeURIComponent(rawValue.replace(/\+/g, " "));
  });
  return out;
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
      files[name] = {
        filename: path.basename(disp.filename),
        contentType: headers["content-type"] || "application/octet-stream",
        data: content,
      };
    } else {
      fields[name] = content.toString("utf8");
    }
  });

  return { fields, files };
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

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function buildPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyHash(passwordAttempt, storedHash) {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const expected = Buffer.from(parts[2], "hex");
  const actual = Buffer.from(
    crypto.scryptSync(passwordAttempt, Buffer.from(parts[1], "hex"), 64).toString("hex"),
    "hex"
  );
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function verifyAdminPassword(passwordAttempt) {
  if (ADMIN_PASS_HASH) return verifyHash(passwordAttempt, ADMIN_PASS_HASH);
  return passwordAttempt === ADMIN_PASS;
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

function loadUsers() {
  const data = readJson(USERS_FILE, { users: [] });
  return Array.isArray(data.users) ? data.users : [];
}

function saveUsers(users) {
  writeJson(USERS_FILE, { users });
}

function loadPending() {
  const data = readJson(PENDING_FILE, { requests: [] });
  return Array.isArray(data.requests) ? data.requests : [];
}

function savePending(requests) {
  writeJson(PENDING_FILE, { requests });
}

function verifyCredential(usernameRaw, password) {
  const username = normalizeUsername(usernameRaw);
  if (!username || !password) return null;

  if (username === normalizeUsername(ADMIN_USER)) {
    if (!verifyAdminPassword(password)) return null;
    return { username: ADMIN_USER, role: "teacher" };
  }

  const user = loadUsers().find((u) => u.username === username && u.status === "approved");
  if (!user) return null;
  if (!verifyHash(password, user.passwordHash)) return null;
  return { username: user.username, role: "student" };
}

function getSession(req) {
  const token = parseCookies(req.headers.cookie || "").portal_session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = now() + SESSION_TTL_MS;
  return { token, session };
}

function requireAuth(req, res, allowedRoles = null) {
  const wrapped = getSession(req);
  if (!wrapped) {
    redirect(res, "/login");
    return null;
  }
  if (Array.isArray(allowedRoles) && !allowedRoles.includes(wrapped.session.role)) {
    sendHtml(res, 403, pageShell("Access denied", `<section class="panel error"><p>Not allowed.</p></section>`));
    return null;
  }
  return wrapped;
}

function pageShell(title, body, banner = "") {
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
      <p class="subtitle">Protected moderation + uploads for <code>${escapeHtml(GITHUB_OWNER)}</code>.</p>
      ${banner}
    </header>
    ${body}
  </main>
</body>
</html>`;
}

function renderLogin(errorText = "", noticeText = "") {
  const error = errorText
    ? `<section class="panel error"><p><strong>Login error:</strong> ${escapeHtml(errorText)}</p></section>`
    : "";
  const notice = noticeText ? `<section class="panel"><p>${escapeHtml(noticeText)}</p></section>` : "";

  return pageShell(
    "Sign In",
    `${notice}${error}
<section class="panel">
  <h2>Access</h2>
  <form method="post" action="/login" class="stack">
    <label>Username
      <input name="username" required autocomplete="username" />
    </label>
    <label>Password
      <input name="password" type="password" required autocomplete="current-password" />
    </label>
    <button type="submit">Login</button>
  </form>
  <p><strong>Teacher default:</strong> ${escapeHtml(ADMIN_USER)} / ${ADMIN_PASS_HASH ? "(hashed password)" : escapeHtml(ADMIN_PASS)}</p>
  <p><a href="/register">Student account request</a></p>
</section>`
  );
}

function renderRegister(errorText = "", noticeText = "") {
  const error = errorText
    ? `<section class="panel error"><p><strong>Request error:</strong> ${escapeHtml(errorText)}</p></section>`
    : "";
  const notice = noticeText ? `<section class="panel"><p>${escapeHtml(noticeText)}</p></section>` : "";

  return pageShell(
    "Student Account Request",
    `${notice}${error}
<section class="panel">
  <h2>Create Request</h2>
  <form method="post" action="/register" class="stack">
    <label>Requested username
      <input name="username" placeholder="team-alpha" required />
    </label>
    <label>Password
      <input name="password" type="password" minlength="6" required />
    </label>
    <label>Confirm password
      <input name="confirmPassword" type="password" minlength="6" required />
    </label>
    <button type="submit">Send request</button>
  </form>
  <p><a href="/login">Back to login</a></p>
</section>`
  );
}

function renderUploadForm(session, isTeacher) {
  const currentYear = new Date().getFullYear();
  const ownerControl = isTeacher
    ? `<label>Project owner alias
      <input name="ownerAlias" placeholder="team-01" required />
    </label>`
    : `<input type="hidden" name="ownerAlias" value="${escapeHtml(session.username)}" />
      <p><strong>Owner:</strong> ${escapeHtml(session.username)}</p>`;

  const visibilityControl = isTeacher
    ? `<label>Visibility
      <select name="visibility">
        <option value="public" ${DEFAULT_VISIBILITY === "public" ? "selected" : ""}>public</option>
        <option value="private" ${DEFAULT_VISIBILITY === "private" ? "selected" : ""}>private</option>
      </select>
    </label>`
    : `<input type="hidden" name="visibility" value="public" />`;

  const featuredControl = isTeacher
    ? `<label class="checkline"><input type="checkbox" name="featured" /><span>Mark as featured</span></label>`
    : "";

  return `<section class="panel">
  <h2>Upload Project ZIP</h2>
  <form method="post" action="/upload" enctype="multipart/form-data" class="stack">
    <input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}" />
    ${ownerControl}

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
    ${featuredControl}

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

    ${visibilityControl}

    <label class="checkline"><input type="checkbox" name="teacherMode" checked /><span>Teacher mode for generated tutorial</span></label>

    <label>Project ZIP file
      <input type="file" name="projectZip" accept=".zip,application/zip" required />
    </label>

    <button type="submit">Publish + Add to Hub</button>
  </form>
</section>`;
}

function renderTeacherDashboard(session, pendingRequests, flash = "") {
  const flashBlock = flash ? `<section class="panel"><p>${flash}</p></section>` : "";
  const pendingList = pendingRequests.length
    ? pendingRequests
        .map(
          (req) => `<li><strong>${escapeHtml(req.username)}</strong> • requested ${escapeHtml(req.requestedAt)}
            <form method="post" action="/approve-user" style="display:inline;">
              <input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}" />
              <input type="hidden" name="username" value="${escapeHtml(req.username)}" />
              <button type="submit">Approve</button>
            </form>
            <form method="post" action="/reject-user" style="display:inline;">
              <input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}" />
              <input type="hidden" name="username" value="${escapeHtml(req.username)}" />
              <button type="submit" class="secondary">Reject</button>
            </form>
          </li>`
        )
        .join("")
    : "<li>No pending account requests.</li>";

  return pageShell(
    "Teacher Dashboard",
    `${flashBlock}
<section class="panel"><h2>Pending Student Accounts</h2><ul>${pendingList}</ul></section>
${renderUploadForm(session, true)}
<section class="panel"><p><a href="/logout">Log out</a></p></section>`
  );
}

function renderStudentDashboard(session, flash = "") {
  const flashBlock = flash ? `<section class="panel"><p>${flash}</p></section>` : "";
  return pageShell(
    "Student Dashboard",
    `${flashBlock}
<section class="panel"><p>Logged in as <strong>${escapeHtml(session.username)}</strong>.</p></section>
${renderUploadForm(session, false)}
<section class="panel"><p><a href="/logout">Log out</a></p></section>`
  );
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

function commandExists(cmd) {
  const result = spawnSync(cmd, ["--version"], { encoding: "utf8" });
  return !result.error && result.status === 0;
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

function cleanupSessions() {
  const t = now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < t) sessions.delete(token);
  }
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

async function handle(req, res) {
  if (req.url.startsWith("/static/")) {
    if (serveStatic(req, res)) return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
    return;
  }

  if (req.method === "GET" && req.url === "/") {
    const s = getSession(req);
    redirect(res, s ? "/dashboard" : "/login");
    return;
  }

  if (req.method === "GET" && req.url === "/login") {
    sendHtml(res, 200, renderLogin());
    return;
  }

  if (req.method === "POST" && req.url === "/login") {
    const body = await readBody(req, 1024 * 20);
    const fields = parseUrlEncoded(body);
    const auth = verifyCredential(fields.username || "", fields.password || "");
    if (!auth) {
      sendHtml(res, 401, renderLogin("Invalid username or password."));
      return;
    }

    const token = randomToken();
    sessions.set(token, {
      username: auth.username,
      role: auth.role,
      csrf: randomToken(),
      expiresAt: now() + SESSION_TTL_MS,
    });

    res.writeHead(302, {
      Location: "/dashboard",
      "Set-Cookie": `portal_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(
        SESSION_TTL_MS / 1000
      )}`,
    });
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/register") {
    sendHtml(res, 200, renderRegister());
    return;
  }

  if (req.method === "POST" && req.url === "/register") {
    const body = await readBody(req, 1024 * 40);
    const fields = parseUrlEncoded(body);

    const username = normalizeUsername(fields.username || "");
    const password = String(fields.password || "");
    const confirmPassword = String(fields.confirmPassword || "");

    if (!username || username.length < 3) {
      sendHtml(res, 400, renderRegister("Username must be at least 3 characters."));
      return;
    }
    if (password.length < 6) {
      sendHtml(res, 400, renderRegister("Password must be at least 6 characters."));
      return;
    }
    if (password !== confirmPassword) {
      sendHtml(res, 400, renderRegister("Passwords do not match."));
      return;
    }
    if (username === normalizeUsername(ADMIN_USER)) {
      sendHtml(res, 400, renderRegister("That username is reserved."));
      return;
    }

    const users = loadUsers();
    const pending = loadPending();
    if (users.some((u) => u.username === username) || pending.some((p) => p.username === username)) {
      sendHtml(res, 400, renderRegister("Username already exists or is pending moderation."));
      return;
    }

    pending.push({
      username,
      passwordHash: buildPasswordHash(password),
      requestedAt: new Date().toISOString(),
    });
    savePending(pending);

    sendHtml(res, 200, renderRegister("", "Request submitted. Wait for teacher approval."));
    return;
  }

  if (req.method === "GET" && req.url === "/logout") {
    const s = getSession(req);
    if (s) sessions.delete(s.token);
    res.writeHead(302, {
      Location: "/login",
      "Set-Cookie": "portal_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/dashboard") {
    const wrapped = requireAuth(req, res);
    if (!wrapped) return;

    const session = wrapped.session;
    if (!session.csrf) session.csrf = randomToken();

    if (session.role === "teacher") {
      sendHtml(res, 200, renderTeacherDashboard(session, loadPending()));
    } else {
      sendHtml(res, 200, renderStudentDashboard(session));
    }
    return;
  }

  if (req.method === "POST" && (req.url === "/approve-user" || req.url === "/reject-user")) {
    const wrapped = requireAuth(req, res, ["teacher"]);
    if (!wrapped) return;

    const body = await readBody(req, 1024 * 20);
    const fields = parseUrlEncoded(body);
    if (!fields.csrf || fields.csrf !== wrapped.session.csrf) {
      throw new Error("Invalid CSRF token.");
    }

    const username = normalizeUsername(fields.username || "");
    const pending = loadPending();
    const idx = pending.findIndex((p) => p.username === username);
    if (idx === -1) throw new Error("Pending account not found.");

    const request = pending[idx];
    pending.splice(idx, 1);
    savePending(pending);

    if (req.url === "/approve-user") {
      const users = loadUsers();
      if (!users.some((u) => u.username === username)) {
        users.push({
          username,
          role: "student",
          status: "approved",
          passwordHash: request.passwordHash,
          approvedAt: new Date().toISOString(),
        });
        saveUsers(users);
      }
    }

    redirect(res, "/dashboard");
    return;
  }

  if (req.method === "POST" && req.url === "/upload") {
    const wrapped = requireAuth(req, res, ["teacher", "student"]);
    if (!wrapped) return;

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
    if (!parsed.fields.csrf || parsed.fields.csrf !== wrapped.session.csrf) {
      throw new Error("Invalid CSRF token.");
    }

    const isTeacher = wrapped.session.role === "teacher";
    const ownerAlias = isTeacher
      ? normalizeUsername(parsed.fields.ownerAlias || "") || "project"
      : normalizeUsername(wrapped.session.username) || "project";

    const projectTitle = String(parsed.fields.projectTitle || "").trim();
    if (!projectTitle) throw new Error("Project title is required.");

    const visibility = isTeacher
      ? String(parsed.fields.visibility || DEFAULT_VISIBILITY).toLowerCase()
      : "public";
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
        featured: isTeacher ? parsed.fields.featured === "on" : false,
      },
      publishResult
    );

    const notes = [
      `[PORTAL] Role: ${wrapped.session.role}`,
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
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

setInterval(cleanupSessions, 1000 * 60 * 10).unref();

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

server.listen(PORT, () => {
  console.log(`Portal running on http://localhost:${PORT}`);
  console.log(`Teacher login: ${ADMIN_USER}`);
  console.log(`GitHub owner target: ${GITHUB_OWNER}`);
});
