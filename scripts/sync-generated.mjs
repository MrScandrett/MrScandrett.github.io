#!/usr/bin/env node
/**
 * sync-generated.mjs — regenerate every committed file that is derived from lessons.
 *
 * The deploy fails when one of these is stale ("The build changed committed files", or the
 * recent-updates test). Running them all, in dependency order, before each commit keeps the
 * generated files in the same commit as the lesson change that caused them.
 *
 *   npm run sync:generated            regenerate in the working tree
 *   npm run check:generated           regenerate, then fail if anything changed (nothing is reverted)
 *   node scripts/sync-generated.mjs --hook
 *                                     what .githooks/pre-commit runs: skip commits that can't
 *                                     affect generated files, regenerate, stage what changed
 *
 * SKIP_SYNC_GENERATED=1 (or `git commit --no-verify`) skips the hook.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const HOOK = process.argv.includes('--hook');
const CHECK = process.argv.includes('--check');

// Order matters: the catalog first, then what reads the catalog.
const STEPS = [
  ['NXT Windows companion', 'scripts/build-nxt-companion.mjs'],
  ['lesson catalog (search index, a11y list)', 'scripts/sync-lessons.mjs', '--fix'],
  ['lessons compendium', 'scripts/sync-steam-lessons-compendium.mjs'],
  ['compendium outline', 'scripts/build-compendium-outline.mjs'],
  ['module glossaries', 'scripts/build-module-glossaries.mjs'],
  ['recent updates', 'scripts/build-recent-updates.mjs'],
];
// A commit touching none of these cannot make a generated file stale.
const RELEVANT = /^(lessons\/|data\/|assets\/js\/|assets\/data\/|apps\/manifest\.json$|steam-lessons\.html$|index\.html$|updates\.html$|COMPENDIUM_OUTLINE\.md$|\.pa11yci\.json$|scripts\/)/;

const git = (...args) => {
  const out = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (out.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${out.stderr}`);
  return out.stdout;
};
const list = text => text.split('\0').filter(Boolean);
const hash = file => {
  try { return createHash('sha1').update(fs.readFileSync(path.join(root, file))).digest('hex'); }
  catch { return null; }
};
// Every file that differs from HEAD or is new, with its content hash.
const snapshot = () => {
  const files = new Set([
    ...list(git('diff', '--name-only', '-z', 'HEAD')),
    ...list(git('ls-files', '--others', '--exclude-standard', '-z')),
  ]);
  return new Map([...files].map(file => [file, hash(file)]));
};

if (HOOK) {
  if (process.env.SKIP_SYNC_GENERATED) process.exit(0);
  const staged = list(git('diff', '--cached', '--name-only', '-z'));
  if (!staged.some(file => RELEVANT.test(file))) process.exit(0);
  console.log('Regenerating files derived from lessons (about 30 s; SKIP_SYNC_GENERATED=1 skips)…');
}

const unstagedBefore = new Set(HOOK ? list(git('diff', '--name-only', '-z')) : []);
const before = snapshot();

for (const [label, script, ...args] of STEPS) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(`${result.stdout || ''}${result.stderr || ''}`);
    console.error(`\n✖ Could not regenerate the ${label} (node ${[script, ...args].join(' ')}). Fix the problem above${HOOK ? ', then commit again' : ''}.`);
    process.exit(1);
  }
}

const after = snapshot();
const changed = [...after].filter(([file, sum]) => before.get(file) !== sum).map(([file]) => file);
for (const file of before.keys()) if (!after.has(file)) changed.push(file); // regenerated back to HEAD

if (!changed.length) {
  if (!HOOK) console.log('✔ Generated files are up to date.');
  process.exit(0);
}

if (CHECK) {
  console.error(`✖ ${changed.length} generated file(s) were stale and have been regenerated. Commit them:\n${changed.map(f => `    ${f}`).join('\n')}`);
  process.exit(1);
}

if (HOOK) {
  // Staging a file that also holds edits you chose not to stage would sweep them into the commit.
  const mixed = changed.filter(file => unstagedBefore.has(file));
  if (mixed.length) {
    console.error(`✖ These files needed regenerating but also have edits you haven't staged:\n${mixed.map(f => `    ${f}`).join('\n')}\n  They are regenerated in your working tree. Review, \`git add\` them, and commit again.`);
    process.exit(1);
  }
  git('add', '--', ...changed);
  console.log(`✔ Regenerated and added to this commit:\n${changed.map(f => `    ${f}`).join('\n')}`);
} else {
  console.log(`✔ Regenerated:\n${changed.map(f => `    ${f}`).join('\n')}`);
}
