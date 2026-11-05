// The teacher tools accept untrusted input: the portal takes students' uploads and serve-local.js
// answers any page open in the teacher's browser. portal/server.js itself is only read here, never
// started, because its approve route commits and pushes to origin.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const { resolveAdminPassword, passwordMatches, createLoginThrottle, safeNextPath, extractZip } = require("../portal/safety.js");

test("the portal has no password in its source", () => {
  const source = fs.readFileSync(path.join(root, "portal/server.js"), "utf8");
  assert.doesNotMatch(source, /ADMIN_PASSWORD\s*(?:\|\||\?\?)\s*["'`]/);
  assert.match(source, /resolveAdminPassword\(process\.env\.ADMIN_PASSWORD\)/);
});

test("an unset password becomes a fresh random one", () => {
  const first = resolveAdminPassword("");
  assert.equal(first.generated, true);
  assert.ok(first.password.length >= 16);
  assert.notEqual(first.password, resolveAdminPassword(undefined).password);
  assert.deepEqual(resolveAdminPassword("my-own-choice"), { password: "my-own-choice", generated: false, retired: false });
});

test("passwords compare exactly", () => {
  assert.equal(passwordMatches("right", "right"), true);
  for (const guess of ["", "righ", "right ", "RIGHT"]) assert.equal(passwordMatches(guess, "right"), false);
});

test("repeated wrong passwords lock only that address, and only for a while", () => {
  let clock = 0;
  const throttle = createLoginThrottle({ maxFailures: 3, lockMs: 1000, now: () => clock });
  for (let i = 0; i < 3; i++) throttle.recordFailure("10.0.0.5");
  assert.equal(throttle.isLocked("10.0.0.5"), true);
  assert.equal(throttle.isLocked("10.0.0.6"), false);
  clock = 1000;
  assert.equal(throttle.isLocked("10.0.0.5"), false);
});

test("sign-in only redirects within the portal", () => {
  for (const good of ["/review", "/live?x=1", "/dashboard"]) assert.equal(safeNextPath(good), good);
  for (const bad of ["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "https://evil.example", "javascript:alert(1)", "", null]) {
    assert.equal(safeNextPath(bad), "/review", String(bad));
  }
});

test("a ZIP holding a symbolic link is refused", { skip: spawnSync("zip", ["-v"]).status !== 0 }, (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "portal-zip-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "game"));
  fs.writeFileSync(path.join(dir, "game/index.html"), "<h1>Game</h1>");

  spawnSync("zip", ["-qr", "clean.zip", "game"], { cwd: dir });
  fs.mkdirSync(path.join(dir, "clean"));
  extractZip(path.join(dir, "clean.zip"), path.join(dir, "clean"));
  assert.ok(fs.existsSync(path.join(dir, "clean/game/index.html")));

  fs.symlinkSync("/etc/hostname", path.join(dir, "game/notes.txt"));
  spawnSync("zip", ["-qry", "linked.zip", "game"], { cwd: dir });
  fs.mkdirSync(path.join(dir, "linked"));
  assert.throws(() => extractZip(path.join(dir, "linked.zip"), path.join(dir, "linked")), /symbolic link/);
});

async function startSite(t) {
  const port = await new Promise((resolve) => {
    const probe = net.createServer().listen(0, "127.0.0.1", () => {
      const { port: free } = probe.address();
      probe.close(() => resolve(free));
    });
  });
  const child = spawn(process.execPath, ["serve-local.js"], { cwd: root, env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", ADMIN_PASS: "" }, stdio: "ignore" });
  t.after(() => child.kill());
  await new Promise((resolve) => {
    const knock = () => net.connect(port, "127.0.0.1").on("connect", function () { this.destroy(); resolve(); }).on("error", () => setTimeout(knock, 50));
    knock();
  });
  return { child, port };
}

// fetch() normalises paths and forbids a custom Host header, so these go out as raw HTTP.
function rawGet(port, target, headers = {}) {
  return new Promise((resolve, reject) => {
    const lines = [`GET ${target} HTTP/1.1`, `Host: ${headers.Host || `127.0.0.1:${port}`}`, "Connection: close"];
    for (const [name, value] of Object.entries(headers)) if (name !== "Host") lines.push(`${name}: ${value}`);
    const socket = net.connect(port, "127.0.0.1", () => socket.write(`${lines.join("\r\n")}\r\n\r\n`));
    let text = "";
    socket.on("data", (chunk) => { text += chunk.toString("latin1"); });
    socket.on("end", () => resolve({ status: Number(text.split(" ")[1]), head: text.split("\r\n\r\n")[0].toLowerCase() }));
    socket.on("error", reject);
  });
}

test("serve-local survives bad URLs and keeps private files private", async (t) => {
  const { child, port } = await startSite(t);
  assert.equal((await rawGet(port, "/%E0%A4%A")).status, 400);
  assert.equal((await rawGet(port, "/%00")).status, 400);
  assert.equal(child.exitCode, null);

  for (const target of ["/.git/config", "/.env", "/lessons/../.git/HEAD", "/%2egit/config", "/portal/pending/x/meta.json", "/portal/uploads/x.zip"]) {
    assert.equal((await rawGet(port, target)).status, 403, target);
  }
  assert.equal((await rawGet(port, "/index.html")).status, 200);
});

test("serve-local only opens up to local pages and sandboxed previews", async (t) => {
  const { port } = await startSite(t);
  const grant = async (origin) => (await rawGet(port, "/index.html", { Origin: origin })).head.match(/access-control-allow-origin: (.*)/)?.[1];
  assert.equal(await grant("https://evil.example"), undefined);
  assert.equal(await grant("http://localhost:3000"), "http://localhost:3000");
  assert.equal(await grant("null"), "null");
  assert.doesNotMatch((await rawGet(port, "/index.html", { Origin: "http://localhost:3000" })).head, /private-network/);

  assert.equal((await rawGet(port, "/api/files", { Host: "evil.example" })).status, 403);
  assert.equal((await rawGet(port, "/api/files", { Host: `localhost:${port}` })).status, 200);
});

test("fish records can only carry embedded models", () => {
  const source = fs.readFileSync(path.join(root, "assets/js/student-fishtank.mjs"), "utf8");
  const limit = Number(/MAX_MODEL_CHARS = ([\d_]+)/.exec(source)[1].replaceAll("_", ""));
  const safeModel = new Function("MAX_MODEL_CHARS", `${/const safeModel = [^\n]+/.exec(source)[0]}; return safeModel;`)(limit);
  assert.equal(safeModel("data:model/stl;base64,AAAA"), "data:model/stl;base64,AAAA");
  assert.equal(safeModel("data:application/octet-stream;base64,AAAA"), "data:application/octet-stream;base64,AAAA");
  for (const bad of ["https://evil.example/fish.glb", "//evil.example/a.glb", "blob:x", 7, null, `data:;base64,${"A".repeat(limit)}`]) {
    assert.equal(safeModel(bad), null);
  }
});
