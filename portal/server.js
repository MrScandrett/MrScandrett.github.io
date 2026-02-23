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
const PUBLISH_SCRIPT = path.join(ROOT_DIR, "publish_to_pages.js");

const LOGIN_USER = process.env.PORTAL_USER || "champion";
const LOGIN_PASS = process.env.PORTAL_PASS || "CPA";
const LOGIN_PASS_HASH = process.env.PORTAL_PASS_HASH || "";
const GITHUB_OWNER = process.env.GITHUB_OWNER || "MrScandrett";
const REPO_PREFIX = process.env.REPO_PREFIX || "student-showcase-";
const DEFAULT_VISIBILITY = (process.env.DEFAULT_VISIBILITY || "public").toLowerCase();
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

if (!fs.existsSync(PUBLISH_SCRIPT)) {
  console.error(`Missing publish script at ${PUBLISH_SCRIPT}`);
  process.exit(1);
}

fs.mkdirSync(WORK_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const sessions = new Map();

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
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[key] = value;
  }
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
    const chunks = [];
    let total = 0;
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
    req.on("error", (err) => reject(err));
  });
}

function parseUrlEncoded(bodyBuffer) {
  const out = {};
  const text = bodyBuffer.toString("utf8");
  for (const part of text.split("&")) {
    if (!part) continue;
    const idx = part.indexOf("=");
    const key = idx === -1 ? part : part.slice(0, idx);
    const rawValue = idx === -1 ? "" : part.slice(idx + 1);
    out[decodeURIComponent(key.replace(/\+/g, " "))] = decodeURIComponent(
      rawValue.replace(/\+/g, " ")
    );
  }
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
  const segments = value.split(";").map((s) => s.trim());
  out.type = segments[0] || "";
  for (const seg of segments.slice(1)) {
    const eqIdx = seg.indexOf("=");
    if (eqIdx === -1) continue;
    const key = seg.slice(0, eqIdx).trim();
    let val = seg.slice(eqIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function parseMultipart(bodyBuffer, boundary) {
  const fields = {};
  const files = {};
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const sections = splitBuffer(bodyBuffer, boundaryBuf).slice(1, -1);

  for (let section of sections) {
    if (section.length === 0) continue;
    if (section.subarray(0, 2).toString("binary") === "\r\n") {
      section = section.subarray(2);
    }
    if (section.subarray(section.length - 2).toString("binary") === "\r\n") {
      section = section.subarray(0, section.length - 2);
    }

    const headerEnd = section.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const headerText = section.subarray(0, headerEnd).toString("utf8");
    let content = section.subarray(headerEnd + 4);
    if (content.subarray(content.length - 2).toString("binary") === "\r\n") {
      content = content.subarray(0, content.length - 2);
    }

    const headers = {};
    for (const line of headerText.split("\r\n")) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    }
    const disposition = parseContentDisposition(headers["content-disposition"] || "");
    const fieldName = disposition.name;
    if (!fieldName) continue;

    if (disposition.filename) {
      files[fieldName] = {
        filename: path.basename(disposition.filename),
        contentType: headers["content-type"] || "application/octet-stream",
        data: content,
      };
    } else {
      fields[fieldName] = content.toString("utf8");
    }
  }

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

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function hashPassword(password, saltHex) {
  const salt = Buffer.from(saltHex, "hex");
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(passwordAttempt) {
  if (LOGIN_PASS_HASH) {
    const parts = LOGIN_PASS_HASH.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") return false;
    const expected = Buffer.from(parts[2], "hex");
    const actual = Buffer.from(hashPassword(passwordAttempt, parts[1]), "hex");
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  }
  return passwordAttempt === LOGIN_PASS;
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.portal_session;
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

function requireAuth(req, res) {
  const s = getSession(req);
  if (!s) {
    redirect(res, "/login");
    return null;
  }
  return s;
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
      <p class="eyebrow">Upload Portal</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">Student uploads to GitHub Pages under <code>${escapeHtml(GITHUB_OWNER)}</code>.</p>
      ${banner}
    </header>
    ${body}
  </main>
</body>
</html>`;
}

function renderLogin(errorText = "") {
  const banner = LOGIN_PASS_HASH
    ? ""
    : `<p class="pill warn">Using fallback password from PORTAL_PASS. Set PORTAL_PASS_HASH for stronger security.</p>`;
  const error = errorText
    ? `<section class="panel error"><p><strong>Login error:</strong> ${escapeHtml(errorText)}</p></section>`
    : "";
  const body = `
${error}
<section class="panel">
  <h2>Sign In</h2>
  <form method="post" action="/login" class="stack">
    <label>Username
      <input name="username" required autocomplete="username" />
    </label>
    <label>Password
      <input name="password" type="password" required autocomplete="current-password" />
    </label>
    <button type="submit">Login</button>
  </form>
</section>`;
  return pageShell("Protected Uploads", body, banner);
}

function renderDashboard(session, flash = "") {
  if (!session.csrf) session.csrf = randomToken();
  const flashBlock = flash
    ? `<section class="panel"><p>${flash}</p></section>`
    : "";
  const body = `
${flashBlock}
<section class="panel">
  <h2>New Upload</h2>
  <form method="post" action="/upload" enctype="multipart/form-data" class="stack">
    <input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}" />
    <label>Student alias (no real names)
      <input name="studentAlias" placeholder="team-01" required />
    </label>
    <label>Repository name (optional)
      <input name="repoName" placeholder="student-showcase-team-01" />
    </label>
    <label>Visibility
      <select name="visibility">
        <option value="public" ${DEFAULT_VISIBILITY === "public" ? "selected" : ""}>public</option>
        <option value="private" ${DEFAULT_VISIBILITY === "private" ? "selected" : ""}>private</option>
      </select>
    </label>
    <label class="checkline">
      <input type="checkbox" name="teacherMode" checked />
      <span>Teacher Mode (skip account setup tutorial content)</span>
    </label>
    <label>Project ZIP file
      <input type="file" name="projectZip" accept=".zip,application/zip" required />
    </label>
    <button type="submit">Publish to GitHub Pages</button>
  </form>
</section>
<section class="panel">
  <h2>Rules</h2>
  <ul>
    <li>ZIP must contain an <code>index.html</code> at root or in one top-level folder.</li>
    <li>No student names in filenames or repo names.</li>
    <li>Portal runs <code>publish_to_pages.js</code> and returns live links.</li>
  </ul>
  <p><a href="/logout">Log out</a></p>
</section>`;
  return pageShell("Teacher Upload Console", body);
}

function renderResult(title, lines, links) {
  const logLines = lines.map((l) => escapeHtml(l)).join("\n");
  const linkHtml = links.length
    ? `<section class="panel">
  <h2>Links</h2>
  <ul>
    ${links
      .map((item) => `<li><strong>${escapeHtml(item.label)}:</strong> <a href="${escapeHtml(item.url)}">${escapeHtml(item.url)}</a></li>`)
      .join("")}
  </ul>
</section>`
    : "";
  const body = `
${linkHtml}
<section class="panel">
  <h2>Publish Log</h2>
  <pre>${logLines}</pre>
</section>
<section class="panel">
  <p><a href="/dashboard">Back to upload form</a></p>
</section>`;
  return pageShell(title, body);
}

function commandExists(cmd) {
  const result = spawnSync(cmd, ["--version"], { encoding: "utf8" });
  return !result.error && result.status === 0;
}

function ensureBinaryChecks() {
  if (!commandExists("git")) {
    throw new Error("git is not installed.");
  }
  if (!commandExists("gh")) {
    throw new Error("GitHub CLI (gh) is not installed. Install with: brew install gh");
  }
  if (!commandExists("unzip")) {
    throw new Error("unzip is required to extract uploaded ZIP files.");
  }
  const auth = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
  if (auth.status !== 0) {
    throw new Error("GitHub CLI is not authenticated. Run: gh auth login");
  }
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
    return {
      projectRoot: topDirs[0],
      note: "index.html found in single top-level folder inside ZIP",
    };
  }

  const hits = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
        hits.push(path.dirname(full));
      }
    }
  }
  walk(dir);

  if (hits.length === 1) {
    return { projectRoot: hits[0], note: "index.html found in nested folder" };
  }
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
  for (const line of lines) {
    if (line.startsWith("LIVE LINK:")) live = line.replace("LIVE LINK:", "").trim();
    if (line.startsWith("TUTORIAL LINK:")) tutorial = line.replace("TUTORIAL LINK:", "").trim();
  }
  return { lines, live, tutorial };
}

function buildRepoName(studentAlias, customRepoName) {
  if (customRepoName && customRepoName.trim()) {
    return sanitizeSlug(customRepoName, `${REPO_PREFIX}project`);
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return sanitizeSlug(`${REPO_PREFIX}${studentAlias}-${stamp}`, `${REPO_PREFIX}project-${stamp}`);
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
  const full = path.join(STATIC_DIR, file);
  if (!fs.existsSync(full)) {
    res.writeHead(404);
    res.end("Not found");
    return true;
  }
  res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
  res.end(fs.readFileSync(full));
  return true;
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
    try {
      const body = await readBody(req, 1024 * 20);
      const fields = parseUrlEncoded(body);
      if (fields.username !== LOGIN_USER || !verifyPassword(fields.password || "")) {
        sendHtml(res, 401, renderLogin("Invalid username or password."));
        return;
      }
      const token = randomToken();
      sessions.set(token, {
        username: fields.username,
        expiresAt: now() + SESSION_TTL_MS,
        csrf: randomToken(),
      });
      res.writeHead(302, {
        Location: "/dashboard",
        "Set-Cookie": `portal_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(
          SESSION_TTL_MS / 1000
        )}`,
      });
      res.end();
      return;
    } catch (error) {
      sendHtml(res, 400, renderLogin(error.message));
      return;
    }
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
    const s = requireAuth(req, res);
    if (!s) return;
    sendHtml(res, 200, renderDashboard(s.session));
    return;
  }

  if (req.method === "POST" && req.url === "/upload") {
    const s = requireAuth(req, res);
    if (!s) return;

    try {
      ensureBinaryChecks();

      const ctype = req.headers["content-type"] || "";
      if (!/multipart\/form-data/i.test(ctype)) {
        throw new Error("Expected multipart form upload.");
      }
      const bmatch = ctype.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      const boundary = ((bmatch && (bmatch[1] || bmatch[2])) || "").trim();
      if (!boundary) throw new Error("Missing upload boundary.");

      const body = await readBody(req, MAX_UPLOAD_BYTES);
      const parsed = parseMultipart(body, boundary);

      if (!parsed.fields.csrf || parsed.fields.csrf !== s.session.csrf) {
        throw new Error("Invalid CSRF token. Refresh and try again.");
      }

      const studentAlias = sanitizeSlug(parsed.fields.studentAlias, "project");
      const repoName = buildRepoName(studentAlias, parsed.fields.repoName || "");
      const visibility = (parsed.fields.visibility || DEFAULT_VISIBILITY).toLowerCase();
      if (!["public", "private"].includes(visibility)) {
        throw new Error("Visibility must be public or private.");
      }
      const teacherMode = parsed.fields.teacherMode === "on";

      const zipFile = parsed.files.projectZip;
      if (!zipFile) throw new Error("Missing project ZIP file.");
      if (!hasZipSignature(zipFile.data)) {
        throw new Error("Uploaded file is not a valid ZIP.");
      }

      const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      const uploadZipPath = path.join(UPLOADS_DIR, `${studentAlias}-${stamp}.zip`);
      const extractDir = path.join(WORK_DIR, `${studentAlias}-${stamp}`);
      fs.mkdirSync(extractDir, { recursive: true });
      fs.writeFileSync(uploadZipPath, zipFile.data);

      const unzip = spawnSync("unzip", ["-o", uploadZipPath, "-d", extractDir], {
        encoding: "utf8",
      });
      if (unzip.status !== 0) {
        throw new Error(`Failed to unzip project: ${(unzip.stderr || unzip.stdout || "").trim()}`);
      }

      const projectScan = findProjectRoot(extractDir);
      const publish = runPublish(projectScan.projectRoot, {
        repoName,
        githubOwner: GITHUB_OWNER,
        visibility,
        teacherMode,
      });

      const links = [];
      if (publish.live) links.push({ label: "Live Link", url: publish.live });
      if (publish.tutorial) links.push({ label: "Tutorial Link", url: publish.tutorial });

      const notes = [
        `[PORTAL] Alias: ${studentAlias}`,
        `[PORTAL] Repo: ${GITHUB_OWNER}/${repoName}`,
        `[PORTAL] Root detection: ${projectScan.note}`,
      ];
      sendHtml(
        res,
        200,
        renderResult("Publish Complete", [...notes, ...publish.lines], links)
      );
      return;
    } catch (error) {
      const safe = escapeHtml(error.lines ? error.lines.join("\n") : error.message);
      sendHtml(
        res,
        400,
        pageShell(
          "Publish Failed",
          `<section class="panel error"><h2>Error</h2><pre>${safe}</pre></section><section class="panel"><p><a href="/dashboard">Back to upload form</a></p></section>`
        )
      );
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

setInterval(cleanupSessions, 1000 * 60 * 10).unref();

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
  console.log(`Login username: ${LOGIN_USER}`);
  if (LOGIN_PASS_HASH) {
    console.log("Password mode: hashed (PORTAL_PASS_HASH)");
  } else {
    console.log("Password mode: fallback plain (PORTAL_PASS)");
  }
  console.log(`GitHub owner target: ${GITHUB_OWNER}`);
});
