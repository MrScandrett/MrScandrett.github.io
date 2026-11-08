#!/usr/bin/env node
// Runs tests/browser/*.test.mjs: tests that drive real lesson pages in Chromium against the dev
// server at http://127.0.0.1:8080. `npm test` leaves them out because they need that server
// and are timing-sensitive on a busy machine; this runner makes them self-contained.
//
//   npm run test:browser                 starts serve-local.js if nothing answers on :8080
//   npm run test:browser -- volcano      only files whose name contains "volcano"
//
// Files run one at a time (--test-concurrency=1): several heavy sims launched in parallel
// starve each other and time out, which made these tests fail at random inside `npm test`.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "tests/browser");
const PORT = 8080;

const filter = process.argv.slice(2).find((a) => !a.startsWith("-"));
const files = fs.readdirSync(DIR)
  .filter((f) => f.endsWith(".test.mjs") && (!filter || f.includes(filter)))
  .sort()
  .map((f) => path.join("tests/browser", f));
if (!files.length) {
  console.error(`No browser tests match "${filter}".`);
  process.exit(1);
}

function answers(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

let server = null;
if (await answers(PORT)) {
  console.log(`Using the server already running on :${PORT}.`);
} else {
  console.log(`Starting serve-local.js on :${PORT} ...`);
  server = spawn(process.execPath, ["serve-local.js"], {
    cwd: ROOT, env: { ...process.env, PORT: String(PORT), ADMIN_PASS: "" }, stdio: "ignore",
  });
  const deadline = Date.now() + 20000;
  while (!(await answers(PORT))) {
    if (Date.now() > deadline || server.exitCode !== null) {
      server.kill();
      console.error("serve-local.js did not start on :" + PORT);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

const run = spawn(process.execPath, ["--test", "--test-concurrency=1", ...files], { cwd: ROOT, stdio: "inherit" });
const code = await new Promise((resolve) => run.on("exit", (c) => resolve(c ?? 1)));
if (server) server.kill();
process.exit(code);
