// Shared, device-local reading history. Existing reader:pos keys remain authoritative.
const HISTORY = 'library:reading-history';
const WANT = 'library:want-to-read';
const LIKED = 'library:liked';
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
  let liked = read(LIKED, []);
  if (!Array.isArray(liked)) liked = [];
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
  function toggleLike(key) {
    const next = liked.includes(key) ? liked.filter(x => x !== key) : [...liked, key];
    if (!commit(LIKED, next)) return;
    liked = next;
    announce(liked.includes(key) ? 'Added to Liked books.' : 'Removed from Liked books.');
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
    const quick = document.createElement('button');
    quick.type = 'button'; quick.className = 'catalog-save'; quick.dataset.wantKey = entry.key;
    quick.setAttribute('aria-label', 'Want to Read: ' + entry.title);
    quick.addEventListener('click', e => { e.stopPropagation(); saveWant(entry.key); });
    entry.book.append(quick);
    for (const popup of [false, true]) {
      const like = document.createElement('button');
      like.type = 'button'; like.className = popup ? 'lib-save-book' : 'catalog-like';
      like.dataset.likeKey = entry.key;
      if (popup) like.tabIndex = button.tabIndex;
      like.addEventListener('click', e => { e.stopPropagation(); toggleLike(entry.key); });
      (popup ? entry.book.querySelector('.book-popup') : entry.book).append(like);
    }
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
    progress.textContent = shelf === 'liked' ? 'Liked by you' : shelf === 'finished' ? 'Finished' : shelf === 'want' ? 'On your reading list' : [pos?.label || entry.label, pct + '% read'].filter(Boolean).join(' · ');
    a.append(cover, title, author, progress);
    if (pos && shelf === 'reading') { const meter = document.createElement('progress'); meter.max = 100; meter.value = pct; meter.setAttribute('aria-label', 'Reading progress'); a.append(meter); }
    a.addEventListener('click', e => {
      if (entry.link && readerBooks[entry.key] && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); goToReader(a.href, entry.link); }
    });
    const action = document.createElement('button'); action.type = 'button'; action.className = 'lib-shelf-action';
    action.textContent = shelf === 'liked' ? 'Remove like' : shelf === 'want' ? 'Remove from list' : shelf === 'finished' ? 'Move to reading' : 'Mark finished';
    action.setAttribute('aria-label', action.textContent + ': ' + entry.title);
    action.addEventListener('click', () => shelf === 'liked' ? toggleLike(entry.key) : shelf === 'want' ? saveWant(entry.key) : setFinished(entry.key, shelf !== 'finished'));
    action.dataset.bookKey = entry.key; action.dataset.shelf = shelf;
    li.append(a, action); return li;
  }
  function render() {
    const focused = document.activeElement?.matches('.lib-shelf-action') ? { key: document.activeElement.dataset.bookKey, shelf: document.activeElement.dataset.shelf } : null;
    const history = read(HISTORY, {});
    const entries = new Map([...books, ...localBooks]);
    Object.entries(history).forEach(([key, item]) => { if (entries.has(key)) entries.set(key, { ...entries.get(key), ...item }); });
    const permitted = entry => entry.book ? !entry.book.classList.contains('is-grade-hidden') : document.documentElement.dataset.libraryGrade === 'all';
    const started = [...entries.values()].filter(entry => permitted(entry) && position(entry.key));
    started.sort((a, b) => (position(b.key)?.at || 0) - (position(a.key)?.at || 0));
    const isFinished = entry => finished.includes(entry.key) || (position(entry.key)?.p >= .99 && !read('library:read-again', []).includes(entry.key));
    const shelves = {
      liked: liked.map(key => entries.get(key)).filter(entry => entry && permitted(entry)),
      reading: started.filter(entry => !isFinished(entry)),
      want: want.map(key => entries.get(key)).filter(entry => entry && permitted(entry)),
      finished: [...entries.values()].filter(entry => permitted(entry) && isFinished(entry))
    };
    for (const [name, items] of Object.entries(shelves)) {
      const list = document.getElementById('libShelf-' + name);
      list.replaceChildren(...items.map(entry => card(entry, name)));
      document.getElementById('libShelfEmpty-' + name).hidden = items.length > 0;
      document.getElementById('libShelfCount-' + name).textContent = String(items.length);
      document.getElementById('libProfile-' + name).textContent = String(items.length);
    }
    const last = started.map(entry => position(entry.key)?.at).filter(at => typeof at === 'number' && Number.isFinite(at) && at > 0).sort((a, b) => b - a)[0];
    document.getElementById('libProfileActivity').textContent = last
      ? 'Last read in this path: ' + new Date(last).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + '. Progress comes from the built-in reader.'
      : 'No recorded reading activity in this path yet. Open a book in the built-in reader to track your place.';
    document.querySelectorAll('[data-like-key]').forEach(button => {
      const on = liked.includes(button.dataset.likeKey);
      button.textContent = on ? '♥ Liked' : '♡ Like';
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', (on ? 'Unlike: ' : 'Like: ') + books.get(button.dataset.likeKey).title);
    });
    if (focused) {
      const target = [...document.querySelectorAll('.lib-shelf-action')].find(b => b.dataset.bookKey === focused.key && b.dataset.shelf === focused.shelf) || document.getElementById('libShelfTitle-' + focused.shelf);
      target.tabIndex = target.tagName === 'BUTTON' ? 0 : -1;
      target.focus({ preventScroll: true });
    }
    document.querySelectorAll('[data-want-key]').forEach(button => {
      const saved = want.includes(button.dataset.wantKey);
      button.textContent = saved ? '✓ Saved' : '+ Want to Read';
      button.setAttribute('aria-label', (saved ? 'Remove from Want to Read: ' : 'Want to Read: ') + books.get(button.dataset.wantKey).title);
      button.setAttribute('aria-pressed', String(saved));
    });
  }
  render();
  fetch('data/book-covers.json').then(r => r.ok ? r.json() : {}).then(data => { covers = data.covers || {}; render(); }).catch(() => {});
  document.addEventListener('library:path-change', render);
  addEventListener('pageshow', render);
  addEventListener('storage', e => { if (e.key?.startsWith('library:') || e.key?.startsWith('reader:pos:')) { want = read(WANT, []); finished = read(FINISHED, []); liked = read(LIKED, []);
    if (!Array.isArray(want)) want = [];
    if (!Array.isArray(finished)) finished = [];
    if (!Array.isArray(liked)) liked = [];
    render(); } });
}
