// Shared, device-local reading history. Existing reader:pos keys remain authoritative.
const HISTORY = 'library:reading-history';
const WANT = 'library:want-to-read';
const FINISHED = 'library:finished';
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
export function rememberReading(key, value) {
  const history = read(HISTORY, {});
  history[key] = { title: value.title, author: value.author, label: value.label, at: value.at };
  write(HISTORY, history);
}
export function initReadingShelves({ readerBooks, goToReader }) {
  const books = new Map();
  document.querySelectorAll('#section-classics .book, #section-nasa .book').forEach(book => {
    const link = book.querySelector('.book-popup-cta[href]');
    if (!link) return;
    const key = link.getAttribute('href');
    books.set(key, { key, title: book.querySelector('.book-popup-title')?.textContent.trim() || 'Your book', author: book.querySelector('.book-popup-author')?.textContent.split('—')[0].trim() || '', book, link });
  });
  let covers = {};
  const localBooks = new Map();
  // Read existing imports too, including books opened before these shelves existed.
  const request = indexedDB.open('classroomos-reader', 1);
  request.onupgradeneeded = () => { request.result.createObjectStore('meta', { keyPath: 'id' }); request.result.createObjectStore('blobs'); };
  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction('meta', 'readonly');
    const meta = tx.objectStore('meta').getAll();
    meta.onsuccess = () => { meta.result.forEach(item => localBooks.set('local:' + item.id, { key: 'local:' + item.id, title: item.title || item.name, author: item.author || '' })); render(); };
    tx.oncomplete = () => db.close();
  };
  request.onerror = () => {};
  let want = read(WANT, []);
  let finished = read(FINISHED, []);
  if (!Array.isArray(want)) want = [];
  if (!Array.isArray(finished)) finished = [];
  const status = document.getElementById('libShelfStatus');
  const announce = text => { status.textContent = text; };
  function commit(key, list) {
    if (!write(key, list)) { announce('Your browser could not save this shelf. Allow site storage and try again.'); return false; }
    return true;
  }
  function saveWant(key) {
    const next = want.includes(key) ? want.filter(x => x !== key) : [...want, key];
    if (!commit(WANT, next)) return;
    want = next;
    announce(want.includes(key) ? 'Added to Want to Read.' : 'Removed from Want to Read.');
    render();
  }
  function setFinished(key, on) {
    let again = read('library:read-again', []);
    again = on ? again.filter(x => x !== key) : [...new Set([...again, key])];
    if (!commit('library:read-again', again)) return;
    const next = on ? [...new Set([...finished, key])] : finished.filter(x => x !== key);
    if (!commit(FINISHED, next)) return;
    finished = next;
    announce(on ? 'Moved to Finished.' : 'Moved back to Jump Right Back In.');
    render();
  }
  books.forEach(entry => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'lib-save-book';
    button.dataset.wantKey = entry.key;
    button.tabIndex = entry.book.classList.contains('is-active') || document.body.classList.contains('lib-list') ? 0 : -1;
    button.addEventListener('click', e => { e.stopPropagation(); saveWant(entry.key); });
    entry.book.querySelector('.book-popup').append(button);
  });
  function position(key) { const pos = read('reader:pos:' + key, null); return pos && Number.isFinite(pos.p) ? pos : null; }
  function url(entry) { return entry.key.startsWith('local:') ? 'reader.html?' + new URLSearchParams({ file: entry.key.slice(6) }) : readerBooks[entry.key] ? 'reader.html?' + new URLSearchParams({ src: entry.key }) : entry.key; }
  function card(entry, shelf) {
    const li = document.createElement('li'); li.className = 'lib-personal-book';
    const a = document.createElement('a'); a.className = 'lib-personal-open'; a.href = url(entry);
    const cover = document.createElement('span'); cover.className = 'lib-personal-cover';
    const info = covers[entry.key];
    if (info) { const img = document.createElement('img'); img.src = info.src; img.alt = ''; img.loading = 'lazy'; cover.append(img); if (info.credit) cover.title = info.credit; }
    else { const text = document.createElement('span'); text.textContent = entry.title; cover.append(text); }
    const title = document.createElement('strong'); title.textContent = entry.title;
    const author = document.createElement('span'); author.className = 'lib-personal-author'; author.textContent = entry.author;
    const progress = document.createElement('span'); progress.className = 'lib-personal-progress';
    const pos = position(entry.key);
    const pct = pos ? Math.min(100, Math.max(0, Math.round(pos.p * 100))) : 0;
    progress.textContent = shelf === 'finished' ? 'Finished' : shelf === 'want' ? 'On your reading list' : [pos?.label || entry.label, pct + '% read'].filter(Boolean).join(' · ');
    a.append(cover, title, author, progress);
    if (pos && shelf === 'reading') { const meter = document.createElement('progress'); meter.max = 100; meter.value = pct; meter.setAttribute('aria-label', 'Reading progress'); a.append(meter); }
    a.addEventListener('click', e => {
      if (entry.link && readerBooks[entry.key] && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); goToReader(a.href, entry.link); }
    });
    const action = document.createElement('button'); action.type = 'button'; action.className = 'lib-shelf-action';
    action.textContent = shelf === 'want' ? 'Remove from list' : shelf === 'finished' ? 'Move to reading' : 'Mark finished';
    action.setAttribute('aria-label', action.textContent + ': ' + entry.title);
    action.addEventListener('click', () => shelf === 'want' ? saveWant(entry.key) : setFinished(entry.key, shelf !== 'finished'));
    action.dataset.bookKey = entry.key; action.dataset.shelf = shelf;
    li.append(a, action); return li;
  }
  function render() {
    const focused = document.activeElement?.matches('.lib-shelf-action') ? { key: document.activeElement.dataset.bookKey, shelf: document.activeElement.dataset.shelf } : null;
    const history = read(HISTORY, {});
    const entries = new Map([...books, ...localBooks]);
    Object.entries(history).forEach(([key, item]) => { if (entries.has(key)) entries.set(key, { ...entries.get(key), ...item }); });
    const started = [...entries.values()].filter(entry => position(entry.key));
    started.sort((a, b) => (position(b.key)?.at || 0) - (position(a.key)?.at || 0));
    const isFinished = entry => finished.includes(entry.key) || (position(entry.key)?.p >= .99 && !read('library:read-again', []).includes(entry.key));
    const shelves = {
      reading: started.filter(entry => !isFinished(entry)),
      want: want.map(key => entries.get(key)).filter(Boolean),
      finished: [...entries.values()].filter(isFinished)
    };
    for (const [name, items] of Object.entries(shelves)) {
      const list = document.getElementById('libShelf-' + name);
      list.replaceChildren(...items.map(entry => card(entry, name)));
      document.getElementById('libShelfEmpty-' + name).hidden = items.length > 0;
      document.getElementById('libShelfCount-' + name).textContent = String(items.length);
    }
    if (focused) {
      const target = [...document.querySelectorAll('.lib-shelf-action')].find(b => b.dataset.bookKey === focused.key && b.dataset.shelf === focused.shelf) || document.getElementById('libShelfTitle-' + focused.shelf);
      target.tabIndex = target.tagName === 'BUTTON' ? 0 : -1;
      target.focus({ preventScroll: true });
    }
    document.querySelectorAll('[data-want-key]').forEach(button => {
      const saved = want.includes(button.dataset.wantKey);
      button.textContent = saved ? 'Saved to Want to Read' : 'Want to Read';
      button.setAttribute('aria-pressed', String(saved));
    });
  }
  render();
  fetch('data/book-covers.json').then(r => r.ok ? r.json() : {}).then(data => { covers = data.covers || {}; render(); }).catch(() => {});
  addEventListener('pageshow', render);
  addEventListener('storage', e => { if (e.key?.startsWith('library:') || e.key?.startsWith('reader:pos:')) { want = read(WANT, []); finished = read(FINISHED, []); render(); } });
}
