(function () {
  'use strict';
  const key = 'classroomos-pilgrims-progress-v1';
  const select = document.getElementById('journal-session');
  const edition = document.getElementById('edition');
  const status = document.getElementById('save-status');
  const fields = ['evidence', 'claim', 'question', 'revision'];
  const checks = Array.from(document.querySelectorAll('[data-read]'));
  let state = { edition: '', entries: {}, read: [] };
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && typeof saved === 'object') {
      state.edition = typeof saved.edition === 'string' ? saved.edition : '';
      for (let i = 1; i <= 12; i++) {
        const entry = saved.entries && saved.entries[i];
        if (entry && typeof entry === 'object') {
          state.entries[i] = {};
          fields.forEach(field => { state.entries[i][field] = typeof entry[field] === 'string' ? entry[field] : ''; });
        }
      }
      state.read = Array.isArray(saved.read) ? saved.read.filter(n => Number.isInteger(n) && n >= 1 && n <= 12) : [];
    }
  } catch (_) { storageAvailable = false; }
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(state));
      storageAvailable = true;
      status.textContent = 'Saved in this browser. Download a copy to keep or share.';
    } catch (_) {
      storageAvailable = false;
      status.textContent = 'Browser saving is unavailable. Your notes remain on this page until you leave; download them now to keep a copy.';
    }
  }
  function progress() {
    document.getElementById('reading-progress').textContent = checks.filter(c => c.checked).length + ' of 12 sessions marked read.';
  }
  function loadEntry() {
    const entry = state.entries[select.value] || {};
    fields.forEach(field => { document.getElementById(field).value = entry[field] || ''; });
  }
  function capture() {
    state.edition = edition.value;
    const entry = {};
    fields.forEach(field => { entry[field] = document.getElementById(field).value; });
    state.entries[select.value] = entry;
  }
  edition.value = state.edition;
  checks.forEach(check => {
    check.checked = state.read.includes(Number(check.dataset.read));
    check.addEventListener('change', () => {
      state.read = checks.filter(c => c.checked).map(c => Number(c.dataset.read));
      progress(); save();
    });
  });
  loadEntry(); progress();
  status.textContent = storageAvailable ? 'Notes save here as you type. Download a copy before leaving a shared device.' : 'Browser saving is unavailable. Download your notes before leaving this page.';
  document.querySelector('.journal-fields').addEventListener('input', event => {
    if (event.target === select) return;
    capture(); save();
  });
  select.addEventListener('change', loadEntry);
  document.querySelectorAll('[data-journal-session]').forEach(link => {
    link.addEventListener('click', () => { select.value = link.dataset.journalSession; loadEntry(); document.getElementById('evidence').focus({ preventScroll: true }); });
  });
  const label = id => select.querySelector('option[value="' + id + '"]').textContent;
  const names = { evidence: 'Textual evidence and location', claim: 'Interpretation and reasoning', question: 'Question or competing reading', revision: 'Revised thinking' };
  function nonemptyEntries() {
    return Object.keys(state.entries).filter(id => fields.some(f => state.entries[id][f])).sort((a, b) => a - b);
  }
  document.getElementById('download-journal').addEventListener('click', () => {
    capture();
    let text = 'The Pilgrim’s Progress · Part One reading journal\nEdition: ' + state.edition + '\nSessions marked read: ' + (state.read.join(', ') || 'None') + '\n';
    nonemptyEntries().forEach(id => {
      text += '\n' + label(id) + '\n';
      fields.forEach(f => { text += names[f] + ':\n' + (state.entries[id][f] || '—') + '\n\n'; });
    });
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'pilgrims-progress-reading-journal.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Journal download requested. Check your downloads for a copy.';
  });
  function preparePrint() {
    capture();
    const root = document.getElementById('journal-print'); root.replaceChildren();
    const info = document.createElement('p'); info.textContent = 'Edition: ' + (state.edition || '________________') + ' · Sessions marked read: ' + (state.read.join(', ') || 'None'); root.appendChild(info);
    const ids = nonemptyEntries();
    if (!ids.length) ids.push(select.value);
    ids.forEach(id => {
      const entry = document.createElement('section'); entry.className = 'print-entry';
      const heading = document.createElement('h3'); heading.textContent = label(id); entry.appendChild(heading);
      fields.forEach(f => {
        const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = names[f] + ':'; p.appendChild(strong); p.appendChild(document.createTextNode('\n' + (state.entries[id] && state.entries[id][f] || '')));
        if (!(state.entries[id] && state.entries[id][f])) p.className = 'worksheet-space';
        entry.appendChild(p);
      }); root.appendChild(entry);
    });
  }
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', () => document.body.classList.remove('print-journal'));
  document.getElementById('print-journal').addEventListener('click', () => { preparePrint(); document.body.classList.add('print-journal'); window.print(); });
  const confirm = document.getElementById('clear-confirm');
  document.getElementById('clear-journal').addEventListener('click', () => { confirm.hidden = false; document.getElementById('cancel-clear').focus(); });
  document.getElementById('cancel-clear').addEventListener('click', () => { confirm.hidden = true; document.getElementById('clear-journal').focus(); });
  document.getElementById('confirm-clear').addEventListener('click', () => {
    state = { edition: '', entries: {}, read: [] };
    edition.value = ''; checks.forEach(c => { c.checked = false; }); loadEntry(); progress();
    let cleared = true;
    try { localStorage.removeItem(key); } catch (_) { cleared = false; }
    status.textContent = cleared ? 'Notes and reading checks cleared from this browser.' : 'Notes cleared on this page. Browser storage could not be cleared; check browser settings before leaving a shared device.';
    confirm.hidden = true; document.getElementById('clear-journal').focus();
  });
})();
