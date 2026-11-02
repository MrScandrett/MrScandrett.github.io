import { LIMITS, bytes, sourcePath, validateFiles, buildPacket, reviewResponse, lineDiff, parseSession } from './core.mjs';
import { saveToFolder } from './folder.mjs';
import { demoFiles, demoTask, demoAnswer } from './demo.mjs';

const $ = id => document.getElementById(id);
const fieldNames = ['brief', 'goal', 'behavior', 'test'];
const state = { files: new Map(), selected: new Set(), name: '', checkpoints: [], packet: null, changes: [], directory: null, demo: false, dirty: false, busy: false };
const status = (message, error = false) => {
  $('cb-status').textContent = message;
  $('cb-status').dataset.error = String(error);
  // A status above the desk can be off screen after a long response or on mobile.
  // Bring actionable errors into view without moving keyboard focus.
  if (error) $('cb-status').scrollIntoView({ block: 'nearest' });
};
const getFields = () => Object.fromEntries(fieldNames.map(key => [key, $(key).value]));
const approved = () => state.changes.filter(change => change.approved && !change.applied);
const idNow = () => `${new Date().toISOString().replace(/[^0-9T]/g, '-')}-${crypto.randomUUID().slice(0, 8)}`;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function step(name, focus = true) {
  document.querySelectorAll('[data-step]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.step === name)));
  for (const key of ['prepare', 'review', 'checkpoint']) $(`panel-${key}`).hidden = key !== name;
  $('current-test').textContent = state.packet?.test || $('test').value.trim() || 'Write a success test in Prepare request.';
  if (name !== 'prepare' && matchMedia('(max-width: 700px)').matches) $('file-browser').open = false;
  if (focus) $(`${name}-title`).focus();
}

function controls() {
  const loaded = state.files.size > 0;
  $('workspace').hidden = !loaded;
  document.querySelector('.cb-start').classList.toggle('has-project', loaded);
  $('start-title').textContent = loaded ? state.name : 'Start with a project';
  $('start-help').hidden = loaded;
  $('practice-start').hidden = loaded;
  $('practice-guide').hidden = !state.demo;
  $('request-output').hidden = !state.packet;
  $('review-blocked').hidden = Boolean(state.packet);
  $('save-controls').hidden = !state.changes.length;
  const selected = state.selected.size;
  $('selection-count').textContent = `${selected} selected for your request`;
  $('approval-count').textContent = `${approved().length} of ${state.changes.length} files approved and waiting to apply`;
  $('prepare-guidance').textContent = state.packet
    ? 'Request ready. Read the preview below, then copy it into your AI chat.'
    : !selected ? 'Start by checking the files the AI needs in Project files.'
    : !$('goal').value.trim() ? `${selected} file${selected === 1 ? '' : 's'} selected. Describe the one change you want to make.`
    : !$('test').value.trim() ? 'Add a test: what will you do, and what should happen?'
    : 'Ready to prepare. Your selected files and task will be combined into one request.';
  $('review-guidance').textContent = !state.packet ? 'Prepare a request first, then return here with the answer.'
    : state.changes.length ? 'Read the changes below. Check a file’s approval box only when you understand its changes. Nothing is saved until you choose a save or download action.'
    : 'Paste the full answer from the AI chat you used for this request. Then choose Review response to see what changed.';

  $('save-session').disabled = !loaded || state.busy;
  $('download-source').disabled = !loaded || state.busy;
  $('reload-folder').disabled = !loaded || state.busy;
  $('reload-folder').textContent = state.directory ? 'Reload folder' : 'Refresh source';
  $('copy-packet').disabled = !state.packet || state.busy;
  $('download-packet').disabled = !state.packet || state.busy;
  $('export-changes').disabled = !approved().length || state.busy;
  $('write-folder').disabled = !approved().length || !state.directory || state.busy;
  $('download-notes').disabled = !loaded;
  $('sample-answer').hidden = !state.demo;
  for (const id of ['open-folder', 'choose-source', 'open-session', 'load-demo', 'prepare-packet', 'import-response', 'save-checkpoint', 'select-none', 'source-files', 'session-file', 'folder-files']) $(id).disabled = state.busy;
  document.querySelectorAll('[data-approval]').forEach(input => { input.disabled = state.busy || state.changes[Number(input.dataset.approval)].applied; });
  for (const key of [...fieldNames, 'budget', 'response']) $(key).disabled = state.busy;
  $('response').disabled = !state.packet || state.busy;
  $('import-response').disabled = !state.packet || state.busy;
  $('sample-answer').disabled = !state.packet || state.busy;
  document.querySelectorAll('[data-go-step]').forEach(button => { button.disabled = state.busy; });
  document.querySelectorAll('#file-list input').forEach(input => { input.disabled = state.busy; });
}

async function run(action) {
  if (state.busy) return;
  state.busy = true;
  controls();
  try { await action(); } catch (error) {
    if (error.message?.includes('budget is')) $('request-size-settings').open = true;
    status(error.message || 'This operation could not finish. Your source was not intentionally changed.', true);
  }
  finally { state.busy = false; controls(); }
}

function invalidateRequest() {
  const hadRequest = Boolean(state.packet);
  state.packet = null;
  state.changes = [];
  $('packet').value = '';
  $('change-list').replaceChildren();
  $('review-summary').textContent = 'Prepare a request using the current task and selection.';
  if (hadRequest) status('Task or file selection changed. Prepare a fresh request before importing an answer.');
  controls();
}

function countSelection() {
  const chars = [...state.selected].reduce((sum, path) => sum + (state.files.get(path)?.length || 0), 0);
  $('budget-count').textContent = `${state.selected.size} selected file${state.selected.size === 1 ? '' : 's'} · ${chars.toLocaleString()} source characters, before instructions and notes.`;
}

function renderFiles() {
  $('file-count').textContent = `${state.files.size} loaded`;
  $('project-name').textContent = state.name || 'No project open';
  $('file-list').replaceChildren();
  const query = $('file-search').value.toLowerCase();
  for (const [path, text] of [...state.files].sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.toLowerCase().includes(query)) continue;
    const row = element('div', undefined, 'cb-file-row');
    const label = element('label', undefined, 'cb-file-label');
    const input = element('input');
    input.type = 'checkbox'; input.checked = state.selected.has(path);
    input.addEventListener('change', () => {
      if (input.checked) state.selected.add(path); else state.selected.delete(path);
      invalidateRequest(); countSelection();
    });
    const name = element('span', path);
    name.append(element('small', `${text.split('\n').length} lines · ${bytes(text).toLocaleString()} bytes`));
    label.append(input, name);
    const read = element('button', 'Read'); read.type = 'button'; read.setAttribute('aria-label', `Read ${path}`);
    read.addEventListener('click', () => {
      $('preview-path').textContent = path;
      $('preview-source').textContent = text;
      $('source-preview').open = true;
      $('preview-source').focus();
    });
    row.append(label, read); $('file-list').append(row);
  }
  if (!$('file-list').children.length) $('file-list').append(element('p', state.files.size ? 'No matching files.' : 'Open a folder or try the practice project.'));
  countSelection(); controls();
}

function setProject({ files, name, directory = null, demo = false, checkpoints = [], ...fields }) {
  state.files = files; state.name = name; state.directory = directory; state.demo = demo;
  state.selected = new Set(); state.checkpoints = checkpoints;
  state.dirty = true;
  $('workflow-help').open = false;
  $('file-browser').open = true;
  invalidateRequest();
  for (const key of fieldNames) $(key).value = fields[key] || '';
  $('response').value = ''; $('file-search').value = '';
  $('preview-source').textContent = ''; $('preview-path').textContent = 'Choose Read beside a file.';
  $('source-preview').open = false;
  $('explanation').value = ''; $('next-task').value = ''; $('test-result').value = 'not-tested';
  $('save-help').textContent = directory ? 'Saving will request write permission, check for newer local edits, and back up originals inside .code-bridge-backups/ before replacing approved files.' : 'This project is a loaded snapshot. Download changes, or open the actual folder in a supported browser to enable direct saving.';
  renderFiles(); renderCheckpoints(); step('prepare', false);
  controls();
}

function canReplace() {
  return !state.dirty || window.confirm('Open a different project? Save a session first if you need these notes or loaded files.');
}

async function readEntries(entries) {
  const loaded = [], skipped = [];
  let total = 0;
  for (const entry of entries) {
    if (!sourcePath(entry.path)) { skipped.push(entry.path); continue; }
    const file = await entry.getFile();
    if (file.size > LIMITS.fileBytes) { skipped.push(entry.path); continue; }
    if (loaded.length >= LIMITS.files || (total += file.size) > LIMITS.projectBytes) throw new Error('This folder is too large. Choose a smaller project: at most 400 source files and 8 MB.');
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer()); }
    catch { skipped.push(entry.path); continue; }
    if (text.includes('\0')) { skipped.push(entry.path); continue; }
    loaded.push({ path: entry.path, text });
  }
  if (!loaded.length) throw new Error('No eligible UTF-8 source files found. Choose your project folder, not its images, dependencies, or build output.');
  return { files: validateFiles(loaded), skipped: skipped.length };
}

async function* walk(directory, prefix = '') {
  for await (const [name, handle] of directory.entries()) {
    const path = prefix + name;
    // Use a pretend source child to share the directory exclusion rules.
    if (handle.kind === 'directory') { if (sourcePath(`${path}/index.js`)) yield* walk(handle, `${path}/`); }
    else yield { path, getFile: () => handle.getFile() };
  }
}

async function readDirectory(directory, preserve = false) {
  const entries = [];
  for await (const entry of walk(directory)) {
    entries.push(entry);
    if (entries.length > 5000) throw new Error('Too many files. Open a smaller project folder.');
  }
  const result = await readEntries(entries);
  const fields = preserve ? getFields() : {};
  const checkpoints = preserve ? state.checkpoints : [];
  setProject({ files: result.files, name: directory.name, directory, checkpoints, ...fields });
  status(`Opened ${state.files.size} source files from ${directory.name}. ${result.skipped} individual files skipped; dependency, build, and hidden folders are excluded. Select the files needed for one task.`);
}

async function openFileList(list, isFolder, preserve = false) {
  const files = [...list];
  if (!files.length) return;
  if (!preserve && !canReplace()) return;
  const name = isFolder ? files[0].webkitRelativePath.split('/')[0] : 'Selected source files';
  const entries = files.map(file => ({ path: isFolder ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name, getFile: async () => file }));
  const result = await readEntries(entries);
  const notes = preserve ? { ...getFields(), checkpoints: state.checkpoints } : {};
  setProject({ files: result.files, name, ...notes });
  status(`Loaded ${state.files.size} source files; skipped ${result.skipped}. This is a snapshot. Re-select current files after making edits in VS Code.`);
}

function download(name, content, type = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob), link = element('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function latestCheckpoint() {
  const item = state.checkpoints.at(-1);
  return item ? `Goal: ${item.goal}\nTest: ${item.test}\nResult: ${item.result}\nEvidence: ${item.explanation}\nNext: ${item.next}` : '';
}

function projectNotes() {
  return `# ${state.name || 'Project'} — Code Bridge notes\n\n${$('brief').value}\n\n${state.checkpoints.map(item => `## ${item.date}\nGoal: ${item.goal}\nTest: ${item.test}\nStudent-reported result: ${item.result}\nEvidence: ${item.explanation}\nNext: ${item.next}`).join('\n\n')}\n`;
}

async function downloadZip(zip, name) {
  if (!window.JSZip) throw new Error('The local ZIP library did not load. Reload the page before downloading.');
  download(name, await zip.generateAsync({ type: 'blob' }), 'application/zip');
}

function renderChanges() {
  $('change-list').replaceChildren();
  for (const [index, change] of state.changes.entries()) {
    const article = element('article', undefined, 'cb-change');
    const diff = lineDiff(change.before, change.after);
    article.append(element('h3', `${change.path}${change.isNew ? ' — new file' : ''}${change.applied ? ' — saved to folder' : ''}`));
    const add = diff.filter(line => line.type === 'add').length, remove = diff.filter(line => line.type === 'remove').length;
    article.append(element('p', `${add} added line${add === 1 ? '' : 's'}; ${remove} removed line${remove === 1 ? '' : 's'}. ${change.after.trim().length === 0 ? 'This replacement empties the file. ' : ''}${change.before.length > 200 && change.after.length < change.before.length / 2 ? 'The file shrank by more than half. Check for missing behavior. ' : ''}Read the changes, then approve this file.`));
    const label = element('label', undefined, 'cb-approve');
    const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.dataset.approval = String(index); checkbox.checked = change.approved; checkbox.disabled = change.applied;
    checkbox.addEventListener('change', () => { change.approved = checkbox.checked; controls(); });
    label.append(checkbox, element('span', change.isNew ? `I reviewed and approve creating ${change.path}` : `I reviewed and approve replacing ${change.path}`));
    const pre = element('pre', undefined, 'cb-diff'); pre.tabIndex = 0; pre.setAttribute('aria-label', `Changes in ${change.path}; plus means added, minus means removed`);
    // Limit rendered context, without shortening source or exported replacements.
    let omitted = 0;
    for (let i = 0; i < diff.length; i++) {
      const line = diff[i];
      const nearbyChange = diff.slice(Math.max(0, i - 3), i + 4).some(item => item.type !== 'same');
      if (line.type === 'same' && !nearbyChange && i > 2 && i < diff.length - 3) { omitted++; continue; }
      if (omitted) { pre.append(element('span', `  … ${omitted} unchanged lines …`)); omitted = 0; }
      pre.append(element('span', `${line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '} ${line.text}`, line.type === 'add' ? 'cb-add' : line.type === 'remove' ? 'cb-remove' : ''));
    }
    const details = element('details'); details.append(element('summary', 'Read complete proposed file'));
    const full = element('pre', change.after); full.tabIndex = 0; details.append(full);
    article.append(label, pre, details); $('change-list').append(article);
  }
  $('review-summary').textContent = `${state.changes.length} changed file${state.changes.length === 1 ? '' : 's'}. Approve each file after reading it. Source is displayed as text and never executed here.`;
  controls();
}

function renderCheckpoints() {
  $('checkpoint-list').replaceChildren();
  $('checkpoint-empty').hidden = state.checkpoints.length > 0;
  for (const item of [...state.checkpoints].reverse()) {
    const li = element('li');
    const resultLabel = { passed: 'passed', failed: 'failed / needs another change', 'not-tested': 'not tested yet' }[item.result];
    li.append(element('strong', `${item.goal} — ${resultLabel}`), element('p', `Test: ${item.test}`), element('p', `Evidence: ${item.explanation}`), element('p', `Next: ${item.next || 'Choose another small task.'}`), element('small', new Date(item.date).toLocaleString()));
    $('checkpoint-list').append(li);
  }
}

$('open-folder').addEventListener('click', () => {
  if (!window.showDirectoryPicker) { $('folder-files').dataset.preserve = 'false'; $('folder-files').click(); return; }
  if (!canReplace()) return;
  // Call the picker directly in the click event to preserve user activation.
  const picking = window.showDirectoryPicker({ mode: 'read' });
  run(async () => {
    let directory;
    try { directory = await picking; } catch (error) { if (error.name === 'AbortError') return; throw error; }
    await readDirectory(directory);
  });
});
$('source-files').addEventListener('change', event => { const list = event.target.files; run(() => openFileList(list, false)); event.target.value = ''; });
$('folder-files').addEventListener('change', event => {
  const list = event.target.files, preserve = event.target.dataset.preserve === 'true';
  event.target.dataset.preserve = 'false';
  run(() => openFileList(list, true, preserve)); event.target.value = '';
});
$('choose-source').addEventListener('click', () => $('source-files').click());
$('open-session').addEventListener('click', () => $('session-file').click());
$('reload-folder').addEventListener('click', () => {
  if (state.directory) { run(() => readDirectory(state.directory, true)); return; }
  if (!window.showDirectoryPicker) { $('folder-files').dataset.preserve = 'true'; $('folder-files').click(); return; }
  const picking = window.showDirectoryPicker({ mode: 'read' });
  run(async () => {
    let directory;
    try { directory = await picking; } catch (error) { if (error.name === 'AbortError') return; throw error; }
    await readDirectory(directory, true);
    status('Current source refreshed; your brief, task, and checkpoints were kept. Select files and prepare a new request.');
  });
});
$('file-search').addEventListener('input', renderFiles);
$('select-none').addEventListener('click', () => { state.selected.clear(); invalidateRequest(); renderFiles(); });
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => step(button.dataset.step)));
document.querySelectorAll('[data-go-step]').forEach(button => button.addEventListener('click', () => step(button.dataset.goStep)));
for (const key of [...fieldNames, 'budget']) $(key).addEventListener('input', () => { state.dirty = true; invalidateRequest(); countSelection(); });
$('response').addEventListener('input', () => { state.changes = []; $('change-list').replaceChildren(); $('review-summary').textContent = 'Response edited. Review it again before approving files.'; controls(); });

$('load-demo').addEventListener('click', () => {
  if (!canReplace()) return;
  setProject({ files: validateFiles(demoFiles), name: 'Jump bug practice', demo: true, ...demoTask });
  state.selected = new Set(['player.js', 'main.js']); renderFiles();
  if (matchMedia('(max-width: 700px)').matches) $('file-browser').open = false;
  status('Practice project loaded. Download its source ZIP, open it in VS Code Live Server, and reproduce the bug. Then prepare a request.');
});
$('prepare-packet').addEventListener('click', () => run(() => {
  const packet = buildPacket({ files: state.files, selected: state.selected, ...getFields(), checkpoint: latestCheckpoint(), budget: Number($('budget').value) });
  state.packet = packet; state.changes = []; $('change-list').replaceChildren(); $('response').value = '';
  $('review-summary').textContent = 'Paste the response to this request to compare its proposed files.';
  $('packet').value = packet.text;
  $('budget-count').textContent = `${packet.chars.toLocaleString()} / ${Number($('budget').value).toLocaleString()} characters · approximately ${packet.estimatedTokens.toLocaleString()} tokens.`;
  $('request-output').hidden = false;
  if (matchMedia('(max-width: 700px)').matches) $('file-browser').open = false;
  $('request-ready-title').focus();
  status('Request ready. Read it, copy it into your approved Google AI chat, then bring its complete response to Review answer.');
}));
$('copy-packet').addEventListener('click', () => run(async () => {
  try { await navigator.clipboard.writeText(state.packet.text); status('Request copied. Paste it into your existing Google AI chat.'); }
  catch { $('packet').focus(); $('packet').select(); status('Clipboard access is unavailable. The request is selected; use Ctrl+C or Command+C.'); }
}));
$('download-packet').addEventListener('click', () => download('code-bridge-request.txt', state.packet.text));
$('sample-answer').addEventListener('click', () => { $('response').value = demoAnswer; state.changes = []; $('change-list').replaceChildren(); controls(); status('Practice answer loaded. Review it, locate the grounded check, and approve only after reading.'); });
$('import-response').addEventListener('click', () => run(() => {
  state.changes = []; $('change-list').replaceChildren();
  state.changes = reviewResponse($('response').value, state.packet, state.files);
  renderChanges(); status('Response parsed. Review each change and approve the files you understand. Nothing has been saved.');
}));

$('export-changes').addEventListener('click', () => run(async () => {
  if (!window.JSZip) throw new Error('The local ZIP library is unavailable. Reload before downloading.');
  const zip = new window.JSZip(), changes = approved();
  for (const change of changes) {
    zip.file(`changes/${change.path}`, change.after);
    if (!change.isNew) zip.file(`backup/${change.path}`, change.before);
  }
  zip.file('README.txt', 'CODE BRIDGE — REVIEWED SOURCE CHANGES\n\nCopy files INSIDE changes/ into matching relative paths in your existing VS Code project. Keep your images, dependencies, and other unchanged files. backup/ holds originals for replaced files; new files have no original backup.\n\nThese backups reflect the loaded snapshot. If you edited a file after preparing the request, compare it in VS Code before replacing it. Test the result, reload your actual project in Code Bridge, then record a checkpoint.\n\nFiles:\n' + changes.map(change => `${change.isNew ? 'NEW' : 'REPLACE'} ${change.path}`).join('\n'));
  zip.file('code-bridge-notes.md', projectNotes());
  await downloadZip(zip, `code-bridge-changes-${idNow()}.zip`);
  status('Changes and original snapshots downloaded. Apply the files in VS Code, test, and reload your project here. Loaded source has not been changed by this export.');
}));
$('download-source').addEventListener('click', () => run(async () => {
  if (!window.JSZip) throw new Error('The local ZIP library is unavailable.');
  const zip = new window.JSZip();
  for (const [path, text] of state.files) zip.file(path, text);
  await downloadZip(zip, 'code-bridge-loaded-source.zip');
  status('Loaded source downloaded. This ZIP contains eligible text files only; keep your other project assets.');
}));
$('write-folder').addEventListener('click', () => {
  if (!state.directory || state.busy) return;
  const changes = approved();
  const permission = state.directory.requestPermission({ mode: 'readwrite' });
  run(async () => {
    if (await permission !== 'granted') throw new Error('Folder write permission was not granted. Download changes and backups instead.');
    const backupPath = await saveToFolder(state.directory, changes, idNow(), change => {
      state.files.set(change.path, change.after); change.applied = true; state.dirty = true;
    }).catch(error => { renderChanges(); renderFiles(); throw error; });
    renderChanges(); renderFiles();
    status(`Saved ${changes.length} approved file${changes.length === 1 ? '' : 's'}. Originals are in ${backupPath} Run the project in VS Code and record the actual test result. Prepare a new request for the next change.`);
  });
});
$('save-checkpoint').addEventListener('click', () => run(() => {
  if (!state.files.size) throw new Error('Open a project before recording a checkpoint.');
  if (!$('explanation').value.trim()) throw new Error('Describe what changed and what you observed, or why it has not been tested.');
  const task = state.packet || getFields();
  if (!task.goal.trim() || !task.test.trim()) throw new Error('Write the task goal and success test in Prepare request first.');
  if (state.checkpoints.length >= 100) throw new Error('This session has 100 checkpoints. Download your notes and start a new project session.');
  state.checkpoints.push({ date: new Date().toISOString(), goal: task.goal, test: task.test, result: $('test-result').value, explanation: $('explanation').value.trim(), next: $('next-task').value.trim() });
  state.dirty = true; renderCheckpoints();
  status('Checkpoint recorded as your reported result. Save your session to keep it. Reload current source before preparing the next task.');
}));
$('download-notes').addEventListener('click', () => download('code-bridge-notes.md', projectNotes(), 'text/markdown;charset=utf-8'));
$('save-session').addEventListener('click', () => {
  download('project.code-bridge.json', JSON.stringify({ format: 'code-bridge', version: 1, name: state.name, ...getFields(), files: [...state.files].map(([path, text]) => ({ path, text })), checkpoints: state.checkpoints }, null, 2), 'application/json');
  state.dirty = false;
  status('Session downloaded with loaded source, your task, and checkpoints. Keep this file. Pending responses are not saved; reopen the actual project folder for current code.');
});
$('session-file').addEventListener('change', event => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file || !canReplace()) return;
  run(async () => {
    if (file.size > 24 * 1024 * 1024) throw new Error('Session file exceeds 24 MB.');
    setProject(parseSession(await file.text())); state.dirty = false;
    status('Session restored as a source snapshot. Use Refresh source to load your current project folder while keeping these notes. Then select files and prepare a fresh request.');
  });
});
window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
controls();
if (new URLSearchParams(location.search).get('practice') === 'jump') $('load-demo').click();
