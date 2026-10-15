#!/usr/bin/env node
import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readdir, stat, realpath, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join, basename, delimiter } from 'node:path';

const HOST = '127.0.0.1';
const PORT = Number(process.env.MUSIC_LAB_VST_PORT || 4777);
const TOKEN = process.env.MUSIC_LAB_VST_TOKEN || randomBytes(12).toString('base64url');
const ROOTS = (process.env.MUSIC_LAB_VST_DIRS || [join(homedir(), '.vst3'), '/usr/local/lib/vst3', '/usr/lib/vst3'].join(':')).split(':').filter(Boolean);
const ORIGINS = new Set((process.env.MUSIC_LAB_VST_ORIGINS || 'http://localhost:8080,http://127.0.0.1:8080,https://mrscandrett.github.io').split(','));
const SAFE_MODE = process.env.MUSIC_LAB_VST_SAFE_MODE === '1';
const CAPABILITIES = { discovery: true, nativeWindow: !SAFE_MODE, projectIdentity: true, audioRouting: false, automation: false, offlineRender: false, latencyReport: false, safeMode: SAFE_MODE };
const launches = new Map();
let lastLaunchAt = 0;

async function findCommand(name) {
  for (const folder of String(process.env.PATH || '').split(delimiter)) {
    const candidate = join(folder, name);
    try { await access(candidate); return candidate; } catch (_) { /* keep looking */ }
  }
  return null;
}

async function readiness() {
  const availableRoots = [];
  for (const root of ROOTS) { try { if ((await stat(root)).isDirectory()) availableRoots.push(root); } catch (_) { /* optional directory */ } }
  const carla = await findCommand('carla-single');
  const pluginCount = (await scan()).length;
  return { ready: !!carla && availableRoots.length > 0, safeMode: SAFE_MODE, carlaAvailable: !!carla, scanRoots: availableRoots.length, pluginCount };
}

const idFor = path => createHash('sha256').update(path).digest('hex').slice(0, 16);
async function scan() {
  const found = [], seen = new Set();
  for (const root of ROOTS) {
    let entries;
    try { entries = await readdir(root, { withFileTypes: true }); } catch (_) { continue; }
    for (const entry of entries) {
      if (!entry.name.toLowerCase().endsWith('.vst3')) continue;
      const path = join(root, entry.name);
      try { if (!(await stat(path)).isDirectory() && !(await stat(path)).isFile()) continue; } catch (_) { continue; }
      let identity;
      try { identity = await realpath(path); } catch (_) { identity = path; }
      if (seen.has(identity)) continue;
      seen.add(identity);
      found.push({ id: idFor(path), name: basename(entry.name, '.vst3'), format: 'VST3', source: root.includes('.vst3') ? 'User' : 'System', path });
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}
function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}
function originAllowed(req) { return !req.headers.origin || ORIGINS.has(req.headers.origin); }
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
function paired(req) { return req.headers.authorization === `Bearer ${TOKEN}`; }

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (!originAllowed(req)) { json(res, 403, { error: 'This website origin is not approved for the VST companion.' }); return; }
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.url === '/v1/health' && req.method === 'GET') {
    json(res, 200, { service: 'Music Lab VST Companion', version: 2, paired: paired(req), host: 'Carla', capabilities: CAPABILITIES }); return;
  }
  if (!paired(req)) { json(res, 401, { error: 'Enter the pairing code shown in the companion terminal.' }); return; }
  if (req.url === '/v1/readiness' && req.method === 'GET') { json(res, 200, await readiness()); return; }
  if (req.url === '/v1/launches' && req.method === 'GET') { json(res, 200, { launches: [...launches.values()].slice(-12) }); return; }
  const plugins = await scan();
  if (req.url === '/v1/plugins' && req.method === 'GET') {
    json(res, 200, { plugins: plugins.map(({ path: _path, ...plugin }) => plugin), capabilities: CAPABILITIES }); return;
  }
  const match = req.url?.match(/^\/v1\/plugins\/([a-f0-9]{16})\/launch$/);
  if (match && req.method === 'POST') {
    if (SAFE_MODE) { json(res, 409, { error: 'Safe mode is active. Plugin windows cannot be opened.' }); return; }
    if (Date.now() - lastLaunchAt < 1500) { json(res, 429, { error: 'Please wait before opening another native plugin.' }); return; }
    const plugin = plugins.find(item => item.id === match[1]);
    if (!plugin) { json(res, 404, { error: 'Plugin is no longer in an approved VST directory.' }); return; }
    lastLaunchAt = Date.now();
    const launchId = randomBytes(8).toString('hex'), record = { id: launchId, pluginId: plugin.id, name: plugin.name, status: 'starting', startedAt: new Date().toISOString() };
    launches.set(launchId, record);
    const child = spawn('carla-single', ['vst3', plugin.path], { detached: true, stdio: 'ignore' });
    child.once('spawn', () => { record.status = 'running'; record.pid = child.pid; });
    child.once('error', error => { record.status = 'failed'; record.error = error.message; process.stderr.write(`[music-vst-bridge] Carla launch failed: ${error.message}\n`); });
    child.once('exit', (code, signal) => { record.status = code === 0 ? 'closed' : 'crashed'; record.exitCode = code; record.signal = signal; record.endedAt = new Date().toISOString(); });
    child.unref(); json(res, 202, { launched: true, launchId, plugin: { id: plugin.id, name: plugin.name } }); return;
  }
  json(res, 404, { error: 'Unknown companion endpoint.' });
});

if (process.argv.includes('--check')) {
  const report = await readiness();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ready ? 0 : 1;
} else {
  server.listen(PORT, HOST, () => {
    process.stdout.write(`Music Lab VST Companion${SAFE_MODE ? ' (SAFE MODE)' : ''}\nURL: http://${HOST}:${PORT}\nPairing code: ${TOKEN}\nScanning: ${ROOTS.join(', ')}\nPress Ctrl+C to stop.\n`);
  });
}
