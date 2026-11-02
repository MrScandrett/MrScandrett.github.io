import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, safePath, sourcePath, validateFiles, buildPacket, parseResponse, reviewResponse, lineDiff, parseSession } from '../assets/js/code-bridge/core.mjs';
import { saveToFolder } from '../assets/js/code-bridge/folder.mjs';
import { demoFiles, demoTask, demoAnswer, fixedPlayerSource } from '../assets/js/code-bridge/demo.mjs';

const original = () => validateFiles(demoFiles);
const packetFor = (files = original(), selected = new Set(['player.js', 'main.js']), overrides = {}) => buildPacket({ files, selected, ...demoTask, ...overrides });
const reply = (path, text) => `### FILE: ${path}\n\`\`\`js\n${text}\n\`\`\``;

test('paths reject traversal, absolute paths, hidden files and cross-platform ambiguity', () => {
  for (const path of ['../a.js', 'src/../a.js', '/tmp/a.js', 'C:\\x.js', 'src\\a.js', 'https://x/a.js', 'a//b.js', 'src/.env', 'file.js\0', 'a/%2e%2e/b.js', 'a./b.js', 'CON.js', 'a/aux.txt', ' a.js', 'a.js ']) assert.throws(() => safePath(path), undefined, path);
  assert.equal(safePath('src/player.js'), 'src/player.js');
});

test('eligible source excludes dependencies, output, credentials, minified files and binaries', () => {
  for (const path of ['node_modules/a.js', '.git/config', 'apps/demo/a.js', 'dist/a.js', 'build/a.js', '.code-bridge-backups/old/a.js', 'secret.json', 'service-account.json', 'credentials.json', 'private-key.txt', '.env.local', 'a.min.js', 'a.min.css', 'package-lock.json', 'sprite.png']) assert.equal(sourcePath(path), false, path);
  for (const path of ['player.js', 'src/player.gd', 'project.godot', 'data/level.json', 'README.md', 'src/game.py', 'art/icon.svg']) assert.equal(sourcePath(path), true, path);
});

test('project validation rejects duplicate paths, case collisions, binary text and oversized source', () => {
  assert.throws(() => validateFiles([{ path: 'a.js', text: 'a' }, { path: 'A.js', text: 'b' }]), /case-conflicting/);
  assert.throws(() => validateFiles([{ path: 'a.js', text: '\0' }]), /text file/);
  assert.throws(() => validateFiles([{ path: 'a.js', text: 'x'.repeat(LIMITS.fileBytes + 1) }]), /512 KB/);
  assert.throws(() => validateFiles(Array.from({ length: LIMITS.files + 1 }, (_, i) => ({ path: `${i}.js`, text: 'a' }))), /at most/);
});

test('packet carries current selected source, file map, task, and checkpoint without unrelated contents', () => {
  const files = original();
  files.set('unused.js', 'UNRELATED_PRIVATE_CONTENT');
  const packet = packetFor(files, new Set(['player.js']), { checkpoint: 'Jump button still works.' });
  assert.match(packet.text, /unused.js/);
  assert.ok(!packet.text.includes('UNRELATED_PRIVATE_CONTENT'));
  assert.ok(packet.text.includes(files.get('player.js')));
  assert.match(packet.text, /Jump button still works/);
  assert.equal(packet.sent.size, 1);
  assert.equal(packet.estimatedTokens, Math.ceil(packet.text.length / 4));
  files.set('player.js', 'new local edit');
  assert.notEqual(packet.baseline.get('player.js'), files.get('player.js'));
});

test('budget rejects the entire oversized packet instead of trimming source', () => {
  assert.throws(() => packetFor(original(), new Set(['player.js']), { budget: 100 }), /No source was truncated/);
  assert.throws(() => packetFor(original(), new Set()), /Select at least/);
  assert.throws(() => packetFor(original(), new Set(['player.js']), { goal: '' }), /one goal/);
  assert.throws(() => packetFor(original(), new Set(['player.js']), { test: '' }), /observable test/);
});

test('response parsing preserves fenced source including literal FILE headings and nested fences', () => {
  const response = '### FILE: guide.md\n````markdown\n# Guide\n### FILE: not-a-response.js\n```js\nalert(1);\n```\n````';
  const files = parseResponse(response);
  assert.equal(files.length, 1);
  assert.equal(files[0].path, 'guide.md');
  assert.match(files[0].text, /alert\(1\)/);
  const packet = packetFor(validateFiles([{ path: 'guide.md', text: '```js\nhello\n```\n' }]), new Set(['guide.md']));
  assert.match(packet.text, /CURRENT FILE: guide.md\n````/);
});

test('malformed, repeated, unsafe, unsupported and omitted files reject the response', () => {
  for (const response of [
    'Try changing the grounded variable.',
    '### FILE: player.js\n```js\ncut off',
    '### FILE: player.js\nno code fence',
    reply('../player.js', 'x'), reply('credentials.json', '{}'), reply('sprite.png', 'x'),
    reply('player.js', '// rest of code unchanged'), reply('player.js', '// ... rest of the code unchanged ...'),
    reply('player.js', '...'), reply('player.js', '…'),
    reply('player.js', 'a') + '\n' + reply('PLAYER.js', 'b'),
  ]) assert.throws(() => parseResponse(response), undefined, response.slice(0, 70));
  assert.equal(parseResponse(reply('player.js', '// An actual useful comment.\nconst a = [...items];'))[0].path, 'player.js');
});

test('review targets sent files only and leaves all approvals initially unchecked', () => {
  const files = original(), packet = packetFor(files);
  const changes = reviewResponse(demoAnswer, packet, files);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].after, fixedPlayerSource);
  assert.equal(changes[0].approved, false);
  assert.equal(changes[0].isNew, false);
  assert.throws(() => reviewResponse(reply('index.html', 'new'), packet, files), /was not sent/);
  assert.throws(() => reviewResponse(demoAnswer, null, files), /Prepare a request/);
  assert.throws(() => reviewResponse(reply('Player.js', 'new'), packet, files), /case conflicts/);
});

test('new files are explicit, empty files stay visible and stale source rejects changes', () => {
  const files = original(), packet = packetFor(files);
  const changes = reviewResponse(reply('levels.js', 'export const levels = [];'), packet, files);
  assert.equal(changes[0].isNew, true);
  assert.equal(changes[0].approved, false);
  assert.equal(reviewResponse(reply('player.js', ''), packet, files)[0].after, '\n');
  files.set('player.js', 'edited in VS Code');
  assert.throws(() => reviewResponse(demoAnswer, packet, files), /changed after/);
  files.set('levels.js', 'just created locally');
  assert.throws(() => reviewResponse(reply('levels.js', 'new'), packet, files), /changed after/);
});

test('CRLF source retains its line ending style on replacement', () => {
  const files = validateFiles([{ path: 'a.js', text: 'one\r\ntwo\r\n' }]);
  const packet = packetFor(files, new Set(['a.js']));
  assert.equal(reviewResponse(reply('a.js', 'one\nthree'), packet, files)[0].after, 'one\r\nthree\r\n');
});

test('diff reconstructs both versions, including changes amid unchanged source and large files', () => {
  for (const [before, after] of [['a\nb\nc\n', 'a\nx\nc\n'], ['', 'hello'], ['a', ''], ['a\n'.repeat(800), 'b\n'.repeat(800)], ['same', 'same']]) {
    const diff = lineDiff(before, after);
    assert.equal(diff.filter(line => line.type !== 'add').map(line => line.text).join('\n'), before);
    assert.equal(diff.filter(line => line.type !== 'remove').map(line => line.text).join('\n'), after);
  }
});

test('sessions restore bounded plain data without source selection, permission or pending responses', () => {
  const data = { format: 'code-bridge', version: 1, name: 'Practice', ...demoTask, files: demoFiles, checkpoints: [{ date: '2026-11-02T12:00:00Z', goal: 'Jump', test: 'Try jumping', result: 'failed', explanation: 'Still flies', next: 'Read grounded' }], directory: 'untrusted', packet: 'untrusted' };
  const restored = parseSession(JSON.stringify(data));
  assert.equal(restored.files.size, 3);
  assert.equal(restored.selected.size, 0);
  assert.equal(restored.directory, undefined);
  assert.equal(restored.packet, undefined);
  assert.equal(restored.checkpoints[0].result, 'failed');
  assert.throws(() => parseSession(JSON.stringify({ ...data, checkpoints: [{ result: 'passed' }] })), /checkpoint/);
  assert.throws(() => parseSession(JSON.stringify({ ...data, version: 9 })), /session JSON/);
});

// File System Access-shaped in-memory adapter exercises real conflict and backup
// behavior without changing any student files on disk.
function fakeFolder(initial) {
  const files = new Map(Object.entries(initial));
  const writes = [];
  let failPath = null;
  function directory(prefix = '') {
    return {
      async getDirectoryHandle(name) { return directory(prefix + name + '/'); },
      async getFileHandle(name, { create = false } = {}) {
        const path = prefix + name;
        if (!create && !files.has(path)) throw Object.assign(new Error('missing'), { name: 'NotFoundError' });
        if (create && !files.has(path)) files.set(path, '');
        return {
          async getFile() { return new File([files.get(path)], name); },
          async createWritable() {
            let pending;
            return { async write(text) { if (path === failPath) throw new Error('simulated write failure'); pending = text; }, async close() { files.set(path, pending); writes.push(path); }, async abort() {} };
          },
        };
      },
    };
  }
  return { root: directory(), files, writes, failOn: path => { failPath = path; } };
}

test('direct saves back up every original before changing any approved source', async () => {
  const disk = fakeFolder({ 'src/player.js': 'before', 'main.js': 'before-main' });
  const changes = [{ path: 'src/player.js', before: 'before', after: 'after', isNew: false }, { path: 'levels.js', before: '', after: 'level', isNew: true }];
  const saved = [];
  const path = await saveToFolder(disk.root, changes, 'test-1', change => saved.push(change.path));
  assert.equal(path, '.code-bridge-backups/test-1/');
  assert.equal(disk.files.get(path + 'src/player.js'), 'before');
  assert.equal(disk.files.get('src/player.js'), 'after');
  assert.equal(disk.files.get('levels.js'), 'level');
  assert.equal(disk.files.get('main.js'), 'before-main');
  assert.ok(disk.writes.indexOf(path + 'src/player.js') < disk.writes.indexOf('src/player.js'));
  assert.deepEqual(saved, ['src/player.js', 'levels.js']);
});

test('disk conflicts preflight the entire batch and prevent overwriting changed or newly created files', async () => {
  const disk = fakeFolder({ 'a.js': 'original', 'b.js': 'new local work', 'new.js': 'already exists' });
  await assert.rejects(saveToFolder(disk.root, [{ path: 'a.js', before: 'original', after: 'edit' }, { path: 'b.js', before: 'old', after: 'edit' }], 'conflict'), /Nothing was saved/);
  await assert.rejects(saveToFolder(disk.root, [{ path: 'new.js', before: '', after: 'edit', isNew: true }], 'new-file'), /Nothing was saved/);
  assert.equal(disk.files.get('a.js'), 'original');
  assert.deepEqual(disk.writes, []);
});

test('UTF-8 BOM source is preserved and does not produce a false disk conflict', async () => {
  const before = '\ufeffconst score = 1;\r\n';
  const files = validateFiles([{ path: 'score.js', text: before }]);
  const changes = reviewResponse(reply('score.js', 'const score = 2;'), packetFor(files, new Set(['score.js'])), files);
  assert.equal(changes[0].after, '\ufeffconst score = 2;\r\n');
  const disk = fakeFolder({ 'score.js': before });
  await saveToFolder(disk.root, changes, 'bom');
  assert.equal(disk.files.get('score.js'), changes[0].after);
  assert.equal(disk.files.get('.code-bridge-backups/bom/score.js'), before);
});

test('partial disk failures report the saved count and preserve backups for recovery', async () => {
  const disk = fakeFolder({ 'a.js': 'a', 'b.js': 'b' });
  disk.failOn('b.js');
  const saved = [];
  await assert.rejects(saveToFolder(disk.root, [{ path: 'a.js', before: 'a', after: 'changed-a' }, { path: 'b.js', before: 'b', after: 'changed-b' }], 'partial', change => saved.push(change.path)), /1 of 2 files saved/);
  assert.deepEqual(saved, ['a.js']);
  assert.equal(disk.files.get('.code-bridge-backups/partial/a.js'), 'a');
  assert.equal(disk.files.get('.code-bridge-backups/partial/b.js'), 'b');
  assert.equal(disk.files.get('b.js'), 'b');
});

test('practice fix changes jump behavior while preserving landing and later jumps', async () => {
  const { player, jump, update } = await import(`data:text/javascript,${encodeURIComponent(fixedPlayerSource)}`);
  jump();
  assert.equal(player.velocity, 12);
  update();
  const airborneVelocity = player.velocity;
  jump();
  assert.equal(player.velocity, airborneVelocity);
  for (let i = 0; i < 100; i++) update();
  assert.equal(player.grounded, true);
  jump();
  assert.equal(player.velocity, 12);
});
