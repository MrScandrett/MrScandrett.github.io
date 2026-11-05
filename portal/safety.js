"use strict";

// The checks that stand between the portal's request handlers and untrusted input, kept apart
// from server.js so tests can call them without starting a server that can push to origin.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// sha256 of the password this repository used to ship as a default. It is public in git history
// forever, so a shell profile or start script still exporting it must not count as "configured".
const RETIRED_PASSWORD_SHA256 = "746a14ebbdab82d962b77a51040a027dca10620a4d3a5b497867b75a768dee7e";

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest();

function resolveAdminPassword(configured) {
  const value = String(configured || "");
  const retired = sha256(value).toString("hex") === RETIRED_PASSWORD_SHA256;
  if (value && !retired) return { password: value, generated: false, retired: false };
  return { password: crypto.randomBytes(12).toString("base64url"), generated: true, retired };
}

/** Compares digests so the time taken says nothing about how much of a guess was right. */
function passwordMatches(candidate, expected) {
  return crypto.timingSafeEqual(sha256(candidate), sha256(expected));
}

/** Slows password guessing per address. A lockout only ever affects the address that earned it. */
function createLoginThrottle({ maxFailures = 8, lockMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const failures = new Map();
  const live = (key) => {
    const entry = failures.get(key);
    if (entry && now() >= entry.expires) {
      failures.delete(key);
      return null;
    }
    return entry || null;
  };
  return {
    isLocked(key) {
      const entry = live(key);
      return Boolean(entry && entry.count >= maxFailures);
    },
    recordFailure(key) {
      const entry = live(key) || { count: 0, expires: 0 };
      entry.count += 1;
      entry.expires = now() + lockMs;
      failures.set(key, entry);
    },
    clear(key) {
      failures.delete(key);
    },
  };
}

/**
 * Where to send someone after signing in. Parsed the way a browser parses it, because "//host",
 * "/\host" and "/<tab>/host" all begin with a slash and all leave the site.
 */
function safeNextPath(value, fallback = "/review") {
  const raw = String(value || "");
  if (!raw.startsWith("/")) return fallback;
  const base = "http://portal.invalid";
  try {
    const url = new URL(raw, base);
    return url.origin === base ? url.pathname + url.search : fallback;
  } catch (_) {
    return fallback;
  }
}

const MAX_ZIP_FILES = 5000;
const MAX_ZIP_UNPACKED_BYTES = 512 * 1024 * 1024;

function assertNoLinks(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`The ZIP contains a shortcut (symbolic link) named "${entry.name}". Remove it and upload the real files.`);
    }
    if (entry.isDirectory()) assertNoLinks(full);
  }
}

/**
 * Unpacks a student's ZIP. Refuses archives that would fill the disk, and any symbolic link: a
 * link to a file on this computer would otherwise be published in place of the student's work.
 */
function extractZip(zipPath, extractDir) {
  const summary = spawnSync("unzip", ["-Z", "-t", zipPath], { encoding: "utf8" });
  const totals = /(\d+) files?, (\d+) bytes? uncompressed/.exec(summary.stdout || "");
  if (!totals) throw new Error("Failed to read the ZIP file.");
  if (Number(totals[1]) > MAX_ZIP_FILES || Number(totals[2]) > MAX_ZIP_UNPACKED_BYTES) {
    throw new Error("That ZIP is too large to unpack.");
  }
  const unzip = spawnSync("unzip", ["-q", "-o", zipPath, "-d", extractDir], { encoding: "utf8" });
  if (unzip.status !== 0) {
    throw new Error(`Failed to unzip project: ${(unzip.stderr || unzip.stdout || "").trim()}`);
  }
  assertNoLinks(extractDir);
}

module.exports = { resolveAdminPassword, passwordMatches, createLoginThrottle, safeNextPath, extractZip };
