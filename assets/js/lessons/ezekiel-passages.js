/* Inline Scripture for the Ezekiel lesson. Text comes from assets/data/bible/ (BSB, KJV, ASV; public domain),
   the same files the class Bible reader uses. Any element with data-passage="10:18-19; 11:22-23" is filled in. */
(() => {
  'use strict';
  const DATA = '../../assets/data/bible/';
  const BOOK = 'ezekiel';
  const TRANSLATIONS = [['bsb', 'BSB', 'Berean Standard Bible (2023)'], ['kjv', 'KJV', 'King James Version (1769)'], ['asv', 'ASV', 'American Standard Version (1901)']];
  const cache = new Map();
  const targets = new Set();
  let tr = 'bsb';
  try {
    const saved = JSON.parse(localStorage.getItem('bible:progress:v1') || 'null');
    if (saved && TRANSLATIONS.some(t => t[0] === saved.tr)) tr = saved.tr;
  } catch (_) { /* no saved preference */ }

  const load = code => {
    if (!cache.has(code)) {
      const p = fetch(`${DATA}${code}/${BOOK}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
      p.catch(() => cache.delete(code));
      cache.set(code, p);
    }
    return cache.get(code);
  };

  // "10:18–19; 11:22–23" -> [{ch:10, from:18, to:19}, ...]
  const parse = spec => spec.split(';').map(part => {
    const m = part.trim().match(/^(\d+):(\d+)(?:\s*[–-]\s*(\d+))?$/);
    return m ? { ch: +m[1], from: +m[2], to: +(m[3] || m[2]) } : null;
  }).filter(Boolean);

  const label = s => `Ezekiel ${s.ch}:${s.from}${s.to > s.from ? '–' + s.to : ''}`;
  const readerHref = s => `../../bible.html#/read/${BOOK}/${s.ch}/${s.from}${s.to > s.from ? '-' + s.to : ''}`;

  async function render(el) {
    const segments = parse(el.dataset.passage || '');
    el.classList.add('ez-passage');
    el.replaceChildren();
    let book;
    try { book = await load(tr); } catch (_) {
      const p = document.createElement('p');
      p.textContent = 'The passage text could not load. ';
      const a = document.createElement('a');
      a.href = readerHref(segments[0] || { ch: 1, from: 1, to: 1 }); a.textContent = 'Open it in the Bible reader →';
      p.append(a); el.append(p); return;
    }
    segments.forEach(s => {
      const wrap = document.createElement('div'); wrap.className = 'ez-passage-seg';
      const head = document.createElement('p'); head.className = 'ez-passage-head';
      const name = document.createElement('strong'); name.textContent = label(s);
      const open = document.createElement('a'); open.href = readerHref(s); open.className = 'ez-passage-open';
      open.textContent = 'Read in the Bible reader →';
      open.setAttribute('aria-label', `Read ${label(s)} in the Bible reader`);
      head.append(name, open);
      const body = document.createElement('p'); body.className = 'ez-verses';
      const verses = (book[s.ch - 1] || []).slice(s.from - 1, s.to);
      verses.forEach((text, i) => {
        const sup = document.createElement('sup'); sup.textContent = s.from + i;
        body.append(sup, document.createTextNode(`${text} `));
      });
      wrap.append(head, body); el.append(wrap);
    });
    const t = TRANSLATIONS.find(x => x[0] === tr);
    const credit = document.createElement('p'); credit.className = 'ez-passage-credit';
    credit.textContent = `${t[2]}. Public domain.`;
    el.append(credit);
  }

  function mount(el, spec) {
    if (spec) el.dataset.passage = spec;
    targets.add(el); return render(el);
  }

  function setTranslation(code) {
    tr = code;
    document.querySelectorAll('.ez-tr-select').forEach(s => { s.value = code; });
    targets.forEach(el => { if (el.isConnected && (el.closest('details') ? el.closest('details').open : true)) render(el); });
  }

  // Details blocks fill in the first time they open (and again if the translation changed while closed).
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || !d.open) return;
    d.querySelectorAll('[data-passage]').forEach(el => { targets.add(el); render(el); });
  }, true);

  document.querySelectorAll('.ez-tr-select').forEach(select => {
    TRANSLATIONS.forEach(([code, short, name]) => {
      const o = document.createElement('option'); o.value = code; o.textContent = `${short} · ${name}`; select.append(o);
    });
    select.value = tr;
    select.addEventListener('change', () => setTranslation(select.value));
  });
  document.querySelectorAll('[data-passage]').forEach(el => {
    if (!el.closest('details')) mount(el);
  });

  window.EzekielPassages = { mount };
})();
