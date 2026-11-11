/* handoff.mjs — passes a 3D file from one tool to another in this browser.
 *
 * Forge, Workbench, Marble Studio and Print Prep each make or read model
 * files; the hand-off lets a student send one straight on ("Send to Print
 * Prep", "Open in Workbench") without downloading it and opening it again.
 *
 *   await sendFile({ bytes, filename, from }) then go to `<page>?from=handoff`
 *   await takeFile() → { bytes, filename, from } or null (the slot is emptied)
 *   await sendAndOpen(url, file) → opens the page, in a new tab when allowed
 *
 * One slot in IndexedDB, not localStorage: a model can be megabytes, and
 * localStorage is 5 MB shared with every saved project. A hand-off older than
 * ten minutes is ignored, so an abandoned one never ambushes a later visit.
 */

const DB = 'classroomos-handoff';
const STORE = 'slot';
const KEY = 'file';
export const TTL_MS = 10 * 60 * 1000;

function open() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('This browser cannot pass files between tools. Download the file and open it instead.')); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open browser storage.'));
  });
}

async function run(mode, fn) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const out = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(out?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Browser storage refused the file (is it full?).'));
    });
  } finally {
    db.close();
  }
}

export async function sendFile({ bytes, filename, from }) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  await run('readwrite', (store) => store.put({ bytes: data, filename: String(filename || 'model.stl'), from: String(from || ''), at: Date.now() }, KEY));
}

export async function takeFile() {
  let hit = null;
  await run('readwrite', (store) => {
    const req = store.get(KEY);
    req.onsuccess = () => { hit = req.result || null; store.delete(KEY); };
    return null;
  });
  if (!hit || !(hit.bytes instanceof Uint8Array) || Date.now() - hit.at > TTL_MS) return null;
  return { bytes: hit.bytes, filename: hit.filename, from: hit.from };
}

/* True when this page was opened to receive a hand-off; clears the marker
   from the address bar so a reload doesn't look for it again. */
export function arrivedByHandoff() {
  const params = new URLSearchParams(location.search);
  if (params.get('from') !== 'handoff') return false;
  params.delete('from');
  const rest = params.toString();
  history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
  return true;
}

/* Call straight from a click: the tab is opened before the await, so the
   browser doesn't treat it as a pop-up. Falls back to this tab. */
export async function sendAndOpen(url, file, { newTab = true } = {}) {
  const target = new URL(url, location.href);
  target.searchParams.set('from', 'handoff');
  const win = newTab ? window.open('', '_blank') : null;
  try {
    await sendFile(file);
  } catch (error) {
    win?.close();
    throw error;
  }
  if (win) { win.opener = null; win.location.href = target.href; } else location.href = target.href;
}
