#!/usr/bin/env node
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const install = process.argv.includes('--install');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const binDir = join(homedir(), '.local', 'bin');
const appDir = join(homedir(), '.local', 'share', 'applications');
const launcher = join(binDir, 'music-lab-vst-companion');
const desktop = join(appDir, 'music-lab-vst-companion.desktop');
const shellQuote = value => `'${String(value).replaceAll("'", "'\\''")}'`;
const launcherText = `#!/bin/sh\nexec node ${shellQuote(join(repo, 'scripts', 'music-vst-bridge.mjs'))} "$@"\n`;
const desktopText = `[Desktop Entry]\nType=Application\nName=Music Lab VST Companion\nComment=Open local VST3 plugins for ClassroomOS Music Lab\nExec=${launcher}\nTerminal=true\nCategories=AudioVideo;Audio;Education;\n`;

if (!install) {
  process.stdout.write(`Installer preview only; no files changed.\nLauncher: ${launcher}\nDesktop entry: ${desktop}\nRepository: ${repo}\nRun npm run music:vst-install -- --install to install.\n`);
} else {
  await mkdir(binDir, { recursive: true }); await mkdir(appDir, { recursive: true });
  await writeFile(launcher, launcherText, { mode: 0o755 }); await chmod(launcher, 0o755);
  await writeFile(desktop, desktopText, { mode: 0o644 });
  process.stdout.write(`Installed ${launcher}\nInstalled ${desktop}\n`);
}
