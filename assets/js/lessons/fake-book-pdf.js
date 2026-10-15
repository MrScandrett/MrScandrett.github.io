/* Local-only PDF reference desk. No optical music recognition or upload. */
import { createMeasureCoach } from './fake-book-pdf-coach.js';
const desk = document.querySelector('[data-pdf-desk]');
const M = window.FakeBookPDFModel;
const $ = name => desk.querySelector('[data-pdf-' + name + ']');
const STORE = 'fakebook:pdf-workspaces:v1';
let pdf, pdfTask, opening = 0, bookKey, book, page = 1, bar = 0, draft, rendering, renderVersion = 0, library = {}, section = 'main', template, selectedSong;
try { library = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (_) { /* empty */ }
const coach = desk ? createMeasureCoach({
  desk,
  canvas: $('canvas'),
  get: () => ({ book, draft, bar, page, fingerprint: bookKey }),
  select: i => { bar = i; fillBar(); },
  jump: p => { page = p; draw(); },
  persist,
  field: name => $(name),
  fill: fillBar
}) : null;
let focused = false, focusMarker, focusScroll = 0;
function setFocus(on) {
  if (!pdf && on) { status('Open a PDF first.'); return; }
  if (on && !focused) { focusScroll = document.querySelector('.ll-sim').scrollTop; focusMarker = document.createComment('PDF desk'); desk.before(focusMarker); document.body.append(desk); }
  if (!on && focused && focusMarker) { focusMarker.replaceWith(desk); document.querySelector('.ll-sim').scrollTop = focusScroll; }
  focused = on; desk.classList.toggle('is-focused', on);
  if (on) { $('workspace').setAttribute('role', 'dialog'); $('workspace').setAttribute('aria-modal', 'true'); $('workspace').setAttribute('aria-label', 'PDF transcription workspace'); } else { $('workspace').removeAttribute('role'); $('workspace').removeAttribute('aria-modal'); } $('focus-close').hidden = !on; $('focus').setAttribute('aria-pressed', String(on));
  if (on) $('focus-close').focus(); else $('focus').focus();
  draw();
}
// The song importer hands PDFs here, so a PDF chosen in the wrong "Choose file" button still opens.
window.FakeBookPDFDesk = { open: file => { desk.open = true; return openFile(file); }, ready: true };
$('focus').onclick = () => setFocus(!focused); $('focus-close').onclick = () => setFocus(false);
document.addEventListener('keydown', e => {
  if (e.key === 'Tab' && focused) {
    const nodes = [...$('workspace').querySelectorAll('button, input, select, textarea, summary, a[href]')].filter(n => !n.disabled && n.getClientRects().length);
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  if (e.key === 'Escape' && focused) { e.preventDefault(); setFocus(false); } });
$('play').onclick = () => document.querySelector('[data-fb-play]').click();
$('show-score').onclick = () => { if (focused) setFocus(false); document.querySelector('[data-fb-sheet]').scrollIntoView({ block: 'center' }); };
function status(message) { $('status').textContent = message; }
function persist() {
  if (!bookKey) return;
  library[bookKey] = book;
  try { localStorage.setItem(STORE, JSON.stringify(library)); } catch (_) { status('Browser storage is full or disabled. Export a workspace backup to keep your work.'); }
}
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fakebook-pdf', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function storedFile(file) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('files', file ? 'readwrite' : 'readonly');
      const req = file ? tx.objectStore('files').put(file, 'recent') : tx.objectStore('files').get('recent');
      let value;
      req.onsuccess = () => { value = req.result; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
function formatContents(s) { return s.title + ' … ' + s.printed + (s.end && s.end !== s.printed ? '-' + s.end : ''); }
function sectionFor(s) { return s.section || 'main'; }
function sectionLabel(id) { return book.sections.find(s => s.id === (id || 'main'))?.label || id || 'Main book'; }
function fillSections() {
  $('section').replaceChildren(); book.sections.forEach(s => $('section').add(new Option(s.label, s.id)));
  $('section').value = section;
}
function setSection(id) {
  section = id; book.activeSection = id; fillSections(); selectedSong = null;
  $('toc').value = book.songs.filter(s => sectionFor(s) === section).map(formatContents).join('\n');
  persist(); anchors(); songs(); showRange();
}
function bookmarks() {
  $('bookmarks').replaceChildren();
  (book.bookmarks || []).forEach(mark => $('bookmarks').append(button(mark.label, () => { setSection(mark.section || 'main'); page = mark.pdf; draw(); })));
}
function songPages(s) { return { first: M.pageFor(s.printed, book.anchors, sectionFor(s)), last: M.pageFor(s.end || s.printed, book.anchors, sectionFor(s)) }; }
function showRange() {
  const range = selectedSong && songPages(selectedSong);
  $('song-range').textContent = range ? selectedSong.title + ' · ' + sectionLabel(sectionFor(selectedSong)) + ' printed ' + selectedSong.printed + (selectedSong.end > selectedSong.printed ? '–' + selectedSong.end : '') + ' · PDF ' + range.first + (range.last !== range.first ? '–' + range.last : '') : 'Select an indexed song to navigate its page range.';
  $('song-prev').disabled = !range || page <= range.first; $('song-next').disabled = !range || page >= range.last;
}
async function openFile(file, save = true) {
  const ticket = ++opening;
  let nextTask;
  status('Opening PDF…');
  try {
    const pdfjs = await import('../../vendor/pdfjs/pdf.min.mjs');
    const base = new URL('../../vendor/pdfjs/', import.meta.url).href;
    pdfjs.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
    nextTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), cMapUrl: base + 'cmaps/', cMapPacked: true, standardFontDataUrl: base + 'standard_fonts/', wasmUrl: base + 'wasm/', isEvalSupported: false });
    const loaded = await nextTask.promise;
    if (ticket !== opening) { await nextTask.destroy(); return; }
    renderVersion++;
    if (rendering) { rendering.cancel(); rendering = null; }
    pdf = null;
    if (pdfTask) await pdfTask.destroy();
    pdfTask = nextTask; pdf = loaded;
    bookKey = (pdf.fingerprints && pdf.fingerprints[0]) || file.name + ':' + file.size;
    book = library[bookKey] || { name: file.name, anchors: [], songs: [], drafts: [], page: 1 };
    book.examples = book.examples || [];
    book.sections = book.sections || [{ id: 'main', label: 'Main book' }];
    section = book.activeSection || 'main'; selectedSong = null; fillSections(); bookmarks();
    template = (window.FakeBookPDFTemplates || []).find(t => t.fingerprint === bookKey && t.pages === pdf.numPages);
    $('template').hidden = !template;
    $('extract').disabled = !!template;
    $('extract').textContent = template ? 'Image-only scan: enter index entries manually' : 'Append text from this page';
    if (template) $('template-note').textContent = 'Recognized: ' + template.label + '. ' + template.note;
    page = Math.max(1, Math.min(pdf.numPages, book.page || 1));
    $('page').max = pdf.numPages;
    $('workspace').hidden = false;
    $('toc').value = book.songs.filter(s => sectionFor(s) === section).map(formatContents).join('\n');
    draft = book.drafts.find(d => d.id === book.activeDraft) || book.drafts[0] || newDraft(); bar = 0;
    refreshDrafts(); fillDraft(); anchors(); songs(); persist(); await draw();
    status(file.name + ' · ' + pdf.numPages + ' pages · kept locally.');
    if (save) {
      try { await storedFile(file); } catch (_) { status('PDF opened. This browser could not retain the file; reopen it next time. Drafts can still be exported.'); }
    }
  } catch (err) { if (ticket === opening) status('Could not open PDF: ' + err.message + (err.name === 'PasswordException' ? '. Unlock this PDF before opening.' : '')); if (nextTask && nextTask !== pdfTask) nextTask.destroy().catch(() => {}); }
}
async function draw() {
  if (!pdf) return;
  const version = ++renderVersion;
  $('canvas').dataset.renderedPage = '';
  if (rendering) { rendering.cancel(); rendering = null; }
  page = Math.max(1, Math.min(pdf.numPages, Math.round(Number(page) || 1)));
  $('page').value = page; book.page = page; persist();
  $('page-info').textContent = book.name + ' · PDF page ' + page + ' of ' + pdf.numPages;
  showRange();
  try {
    const p = await pdf.getPage(page);
    if (version !== renderVersion) return;
    const initial = p.getViewport({ scale: 1 });
    const viewportContainer = $('canvas').closest('.fb-pdf-viewport') || $('canvas').parentElement;
    const width = Math.max(240, viewportContainer.clientWidth - 16) * Number($('zoom').value);
    const viewport = p.getViewport({ scale: width / initial.width });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = $('canvas'); canvas.width = Math.ceil(viewport.width * dpr); canvas.height = Math.ceil(viewport.height * dpr);
    canvas.style.width = viewport.width + 'px'; canvas.style.height = viewport.height + 'px';
    rendering = p.render({ canvas, canvasContext: canvas.getContext('2d'), viewport, transform: [dpr, 0, 0, dpr, 0, 0] });
    await rendering.promise;
    if (version === renderVersion) { rendering = null; canvas.dataset.renderedPage = String(page); coach?.refresh(); }
  } catch (err) { if (version === renderVersion && err.name !== 'RenderingCancelledException') status('Page could not render: ' + err.message); }
}
function button(text, action) { const b = document.createElement('button'); b.type = 'button'; b.className = 'fb-btn'; b.textContent = text; b.onclick = action; return b; }
function anchors() {
  $('anchors').replaceChildren();
  book.anchors.filter(a => sectionFor(a) === section).sort((a,b) => a.printed - b.printed).forEach(a => {
    const row = document.createElement('p'); row.textContent = 'Printed ' + a.printed + ' → PDF ' + a.pdf + ' ';
    row.append(button('Remove anchor ' + a.printed, () => { book.anchors = book.anchors.filter(x => x !== a); persist(); anchors(); songs(); })); $('anchors').append(row);
  });
}
function songs() {
  $('songs').replaceChildren();
  const query = $('search').value.toLowerCase();
  book.songs.filter(s => sectionFor(s) === section && s.title.toLowerCase().includes(query)).forEach(s => {
    const target = M.pageFor(s.printed, book.anchors, sectionFor(s));
    const b = button(s.title + ' · printed ' + s.printed + ' → PDF ' + target, () => {
      selectedSong = s; page = target; draw();
      draft = book.drafts.find(d => d.title === s.title && d.sourcePrinted === s.printed && (d.sourceSection || 'main') === sectionFor(s)) || newDraft(s.title, s.printed);
      bar = 0; refreshDrafts(); fillDraft();
    });
    b.disabled = target < 1 || target > pdf.numPages;
    if (b.disabled) b.title = 'Page is outside this PDF. Check page anchors.';
    $('songs').append(b);
  });
}
function newDraft(title = '', printed = null) {
  const d = { id: 'pdf-' + Date.now() + '-' + Math.random().toString(36).slice(2,7), title, composer: '', key: 'C', mode: 'major', meter: '4/4', tempo: 96, pickup: 0, sourcePDF: page, sourcePrinted: printed, sourceSection: section, sourceNote: '', bars: [{ notes: '', chords: '', section: '' }] };
  book.drafts.push(d); persist(); return d;
}
const fields = ['title', 'composer', 'key', 'mode', 'meter', 'tempo', 'pickup'];
function refreshDrafts() {
  $('drafts').replaceChildren();
  book.drafts.forEach(d => { const o = new Option(d.title || 'Untitled draft', d.id); $('drafts').add(o); }); $('drafts').value = draft.id;
}
function fillDraft() { $('source-note').value = draft.sourceNote || ''; book.activeDraft = draft.id; persist(); fields.forEach(f => { $(f).value = draft[f]; }); fillBar(); }
function fillBar() {
  $('bar-section').value = draft.bars[bar].section || '';
  $('notes').value = draft.bars[bar].notes; $('chords').value = draft.bars[bar].chords;
  $('bar-label').textContent = 'Bar ' + (bar + 1) + ' / ' + draft.bars.length;
  $('bar-prev').disabled = bar === 0; $('bar-next').disabled = bar === draft.bars.length - 1;
  $('delete-bar').disabled = draft.bars.length === 1; checkBar();
  coach?.refresh();
}
function checkBar() {
  try {
    const actual = M.beats(draft.bars[bar].notes), meter = draft.meter.split('/').map(Number);
    const want = bar === 0 && Number(draft.pickup) ? Number(draft.pickup) : meter[0] * 4 / meter[1];
    $('beats').textContent = actual.toFixed(2).replace(/\.00$/, '') + ' / ' + want + ' beats' + (Math.abs(actual - want) < 0.0001 ? ' · rhythm fits' : ' · adjust this bar');
  } catch (err) { $('beats').textContent = err.message; }
}
fields.forEach(f => $(f).addEventListener('input', () => { if (!draft) return; draft[f] = $(f).value; persist(); if (f === 'title') refreshDrafts(); checkBar(); coach?.refresh(); }));
['notes', 'chords'].forEach(f => $(f).addEventListener('input', () => { draft.bars[bar][f] = $(f).value; persist(); checkBar(); coach?.invalidate(); coach?.refresh(); }));
$('file').onchange = () => { if ($('file').files[0]) openFile($('file').files[0]); $('file').value = ''; };
$('resume').onclick = async () => { try { const f = await storedFile(); if (f) await openFile(f, false); else status('No PDF saved yet. Open a PDF first.'); } catch (_) { status('Saved PDF storage is unavailable. Open the PDF again.'); } };
$('prev').onclick = () => { page--; draw(); }; $('next').onclick = () => { page++; draw(); };
$('page').onchange = () => { page = $('page').value; draw(); }; $('zoom').onchange = draw;
$('anchor').onclick = () => { const printed = Number($('printed').value); if (!Number.isInteger(printed) || printed < 1) { status('Enter a positive printed page number.'); return; } book.anchors = book.anchors.filter(a => a.printed !== printed || sectionFor(a) !== section); book.anchors.push({ printed, pdf: page, section }); persist(); anchors(); songs(); status('Matched printed page ' + printed + ' to PDF page ' + page + '.'); };
$('extract').onclick = async () => {
  try {
    const text = await (await pdf.getPage(page)).getTextContent();
    let lines = [], line = '', previousY;
    text.items.forEach(item => { const y = item.transform[5]; if (previousY !== undefined && Math.abs(y - previousY) > 3 && line) { lines.push(line); line = ''; } line += item.str + ' '; previousY = y; if (item.hasEOL) { lines.push(line); line = ''; previousY = undefined; } });
    if (line) lines.push(line);
    $('toc').value = ($('toc').value.trim() ? $('toc').value.trim() + '\n' : '') + lines.join('\n'); status(text.items.length ? 'Text extracted. Edit the title/page lines, then apply the song index.' : 'This page has no selectable text. Type or paste the contents manually.');
  } catch (err) { status('Text extraction failed: ' + err.message); }
};
$('index').onclick = () => { const list = M.contents($('toc').value, section); if (!list.length) { status('No title/page lines recognized. Use “Song title … 25”.'); return; } book.songs = book.songs.filter(s => sectionFor(s) !== section).concat(list); persist(); songs(); status(list.length + ' songs indexed. Check their page destinations before transcribing.'); };
$('search').oninput = songs;
$('drafts').onchange = () => { draft = book.drafts.find(d => d.id === $('drafts').value); bar = 0; setSection(draft.sourceSection || 'main'); selectedSong = book.songs.find(s => s.title === draft.title && s.printed === draft.sourcePrinted && sectionFor(s) === section); page = draft.sourcePrinted ? M.pageFor(draft.sourcePrinted, book.anchors, section) : draft.sourcePDF; draw(); fillDraft(); };
$('new').onclick = () => { selectedSong = null; showRange(); draft = newDraft(); bar = 0; refreshDrafts(); fillDraft(); $('title').focus(); };
$('bar-prev').onclick = () => { bar--; fillBar(); }; $('bar-next').onclick = () => { bar++; fillBar(); };
$('add-bar').onclick = () => { draft.bars.splice(bar + 1, 0, { notes: '', chords: '', section: '' }); bar++; persist(); fillBar(); };
$('copy-bar').onclick = () => {
  const cloned = { ...draft.bars[bar] };
  if (cloned.source) cloned.source = { ...cloned.source, id: 'measure-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), reviewed: false };
  delete cloned.proposal; delete cloned.coachUndo;
  draft.bars.splice(bar + 1, 0, cloned);
  bar++; persist(); fillBar();
};
$('delete-bar').onclick = () => {
  if (draft.bars.length === 1) return;
  coach?.invalidate();
  draft.bars.splice(bar, 1);
  bar = Math.min(bar, draft.bars.length - 1);
  persist(); fillBar();
};
function addToken(rest) {
  const pitch = rest ? 'r' : $('pitch').value.trim();
  if (!rest && !/^[A-G](?:##|bb|#|b)?\d$/.test(pitch)) { $('editor-status').textContent = 'Use a pitch such as C4, F#4 or Bb4.'; return; }
  const token = pitch + $('duration').value + ($('triplet').checked ? '3' : '') + ($('dot').checked ? '.' : '') + (!rest && $('tie').checked ? '~' : '');
  const input = $('notes'), start = input.selectionStart, end = input.selectionEnd;
  input.setRangeText((start && !/\s/.test(input.value[start - 1]) ? ' ' : '') + token + ' ', start, end, 'end');
  draft.bars[bar].notes = input.value; persist(); checkBar(); input.focus();
}
$('note').onclick = () => addToken(false); $('rest').onclick = () => addToken(true);
$('load').onclick = () => {
  try {
    const source = book.name + ' · ' + (draft.sourcePrinted ? sectionLabel(draft.sourceSection) + ' printed page ' + draft.sourcePrinted + ' · ' : '') + 'PDF page ' + (draft.sourcePrinted ? M.pageFor(draft.sourcePrinted, book.anchors, draft.sourceSection || 'main') : draft.sourcePDF) + ' (manual transcription, browser-local).';
    window.FakeBook.saveTranscription(M.tune(draft, source));
    $('editor-status').textContent = 'Saved to Your imports and loaded above. Use Play to check, then edit this draft and reload to update the same song.';
  } catch (err) { $('editor-status').textContent = err.message; }
};
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, fingerprint: bookKey, book }, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'fake-book-workspace.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('restore').onchange = async () => {
  const file = $('restore').files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.version !== 1 || data.fingerprint !== bookKey) throw new Error('Open the same PDF used by this backup first.');
    const b = data.book;
    if (!b || !Array.isArray(b.anchors) || !Array.isArray(b.songs) || !Array.isArray(b.drafts) || !b.drafts.length) throw new Error('Invalid workspace backup.');
    if (b.anchors.some(a => !Number.isInteger(a.printed) || a.printed < 1 || !Number.isInteger(a.pdf) || a.pdf < 1 || a.pdf > pdf.numPages) || b.songs.some(s => typeof s.title !== 'string' || !Number.isInteger(s.printed) || s.printed < 1) || b.drafts.some(d => typeof d.id !== 'string' || !/^pdf-[\w-]+$/.test(d.id) || fields.some(f => !['string','number'].includes(typeof d[f])) || !Array.isArray(d.bars) || !d.bars.length || d.bars.some(r => typeof r.notes !== 'string' || typeof r.chords !== 'string'))) throw new Error('Invalid workspace fields.');
    if (b.sections && (!Array.isArray(b.sections) || !b.sections.length || b.sections.some(s => typeof s.id !== 'string' || typeof s.label !== 'string'))) throw new Error('Invalid page sections.');
    if (b.songs.some(s => s.end !== undefined && (!Number.isInteger(s.end) || s.end < s.printed))) throw new Error('Invalid song page range.');
    // Merge backup drafts by ID so restoring never discards newer unrelated drafts.
    b.drafts.forEach(d => { const i = book.drafts.findIndex(x => x.id === d.id); if (i < 0) book.drafts.push(d); else book.drafts[i] = d; });
    book.anchors = b.anchors; book.songs = b.songs; book.sections = b.sections || [{id:'main', label:'Main book'}]; book.bookmarks = b.bookmarks || [];
    book.examples = Array.isArray(b.examples) ? b.examples : (book.examples || []);
    section = book.sections[0].id; fillSections(); bookmarks(); persist(); draft = book.drafts[0]; bar = 0; refreshDrafts(); fillDraft(); anchors(); songs(); $('toc').value = book.songs.filter(s => sectionFor(s) === section).map(formatContents).join('\n'); status('Workspace restored.');
  } catch (err) { status('Could not restore: ' + err.message); }
  $('restore').value = '';
};
$('section').onchange = () => setSection($('section').value);
$('section-add').onclick = () => {
  const label = $('section-name').value.trim(); if (!label) { status('Name the numbered section.'); return; }
  const id = 'section-' + Date.now(); book.sections.push({ id, label }); setSection(id); $('section-name').value = ''; status('Added ' + label + '. Calibrate its printed page 1 separately.');
};
$('song-prev').onclick = () => { page--; draw(); }; $('song-next').onclick = () => { page++; draw(); };
$('entry-add').onclick = () => {
  const title = $('entry-title').value.trim(), printed = Number($('entry-start').value), end = Number($('entry-end').value || printed);
  if (!title || !Number.isInteger(printed) || printed < 1 || !Number.isInteger(end) || end < printed) { status('Enter a title and valid printed page range.'); return; }
  const entry = { title, printed, end, section };
  const i = book.songs.findIndex(s => s.title.toLowerCase() === title.toLowerCase() && sectionFor(s) === section);
  if (i < 0) book.songs.push(entry); else book.songs[i] = entry;
  $('toc').value = book.songs.filter(s => sectionFor(s) === section).map(formatContents).join('\n'); persist(); songs(); status('Indexed ' + title + ' in ' + sectionLabel(section) + '.');
};
$('source-note').oninput = () => { draft.sourceNote = $('source-note').value; persist(); };
$('bar-section').oninput = () => { draft.bars[bar].section = $('bar-section').value; persist(); };
$('template-apply').onclick = () => {
  if (!template) return;
  template.sections.forEach(s => { if (!book.sections.some(x => x.id === s.id)) book.sections.push({ ...s }); });
  template.anchors.forEach(a => { const i = book.anchors.findIndex(x => sectionFor(x) === a.section && x.printed === a.printed); if (i < 0) book.anchors.push({ ...a }); else book.anchors[i] = { ...a }; });
  template.songs.forEach(s => { if (!book.songs.some(x => sectionFor(x) === s.section && x.printed === s.printed && x.title === s.title)) book.songs.push({ ...s }); });
  book.bookmarks = template.bookmarks.map(b => ({ ...b })); setSection('main'); bookmarks(); page = 14; draw();
  status('Applied verified main/additions page anchors and a partial starter index. Add remaining songs from PDF contents pages 3–8.');
};
['C','G','D','A','E','B','F#','F','Bb','Eb','Ab','Db','Gb'].forEach(k => $('key').add(new Option(k, k)));
let resizeTimer;
const resizeTarget = $('canvas').closest('.fb-pdf-viewport') || $('canvas').parentElement;
new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (pdf && desk.open) draw(); }, 150); }).observe(resizeTarget);
desk.addEventListener('toggle', () => { if (desk.open && pdf) draw(); });
