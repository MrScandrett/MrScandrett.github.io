import { safePath } from './core.mjs';

export async function fileAt(root, path, create = false) {
  const parts = safePath(path).split('/');
  let directory = root;
  for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part, { create });
  return directory.getFileHandle(parts.at(-1), { create });
}

async function readCurrent(root, path) {
  try {
    const file = await (await fileAt(root, path)).getFile();
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer());
  }
  catch (error) { if (error.name === 'NotFoundError') return null; throw error; }
}

async function writeFile(handle, text) {
  const stream = await handle.createWritable();
  try { await stream.write(text); await stream.close(); }
  catch (error) { try { await stream.abort(); } catch {} throw error; }
}

// Permission is requested by the UI from the user's Save click, not on import.
// Preflight the entire batch, then recheck each file directly before replacement.
export async function saveToFolder(root, changes, id, onSaved = () => {}) {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid backup ID.');
  if (!changes.length) throw new Error('Approve at least one file first.');
  for (const change of changes) {
    const current = await readCurrent(root, change.path);
    if (current !== (change.isNew ? null : change.before)) throw new Error(`${change.path} has changed on disk. Nothing was saved. Reload your project and make a fresh request.`);
  }
  const backups = await root.getDirectoryHandle('.code-bridge-backups', { create: true });
  const backup = await backups.getDirectoryHandle(id, { create: true });
  // Complete every backup before replacing any project file.
  for (const change of changes) if (!change.isNew) await writeFile(await fileAt(backup, change.path, true), change.before);
  await writeFile(await backup.getFileHandle('code-bridge-backup.json', { create: true }), JSON.stringify({ created: new Date().toISOString(), files: changes.map(({ path, isNew }) => ({ path, isNew })) }, null, 2));
  let saved = 0;
  try {
    for (const change of changes) {
      if (await readCurrent(root, change.path) !== (change.isNew ? null : change.before)) throw new Error(`${change.path} changed while saving. Reload before continuing.`);
      await writeFile(await fileAt(root, change.path, true), change.after);
      saved++;
      onSaved(change);
    }
  } catch (error) { throw new Error(`${saved} of ${changes.length} files saved. ${error.message} Originals are in .code-bridge-backups/${id}/.`); }
  return `.code-bridge-backups/${id}/`;
}
