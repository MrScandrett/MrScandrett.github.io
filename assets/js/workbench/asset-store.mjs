/* asset-store.mjs — keeps Workbench's imported models in IndexedDB, so the
 * localStorage autosave (the project tree, a few KB) never has to hold
 * megabytes of triangles. A saved .workbench.json carries its own copies, so
 * clearing this store loses nothing that was saved to a file.
 */

const DB = 'classroomos-workbench';
const STORE = 'assets';

let opening = null;
function db() {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('no IndexedDB')); return; }
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    opening.catch(() => { opening = null; });
  }
  return opening;
}

function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export function putAsset(asset) {
  return tx('readwrite', (s) => s.put({ ...asset, at: Date.now() }));
}

export async function getAssets(ids) {
  const out = new Map();
  if (!ids.size) return out;
  await tx('readonly', (s) => {
    for (const id of ids) {
      const req = s.get(id);
      req.onsuccess = () => { if (req.result) out.set(id, req.result); };
    }
    return null;
  });
  return out;
}

/* Drops models no open project uses and that are over a week old: a student
   who imported something last lesson and undid it still finds it today. */
export function pruneAssets(keep, maxAgeMs = 7 * 24 * 3600 * 1000) {
  const now = Date.now();
  return tx('readwrite', (s) => {
    const req = s.openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) return;
      if (!keep.has(cur.value.id) && now - (cur.value.at || 0) > maxAgeMs) cur.delete();
      cur.continue();
    };
    return null;
  });
}
