// Labs for lessons/web-design/web-local-server.html.
import { parseFileList, resolveRequest, REASON } from './web-local-server-core.mjs';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, text) => {
  const node = Object.assign(document.createElement(tag), props);
  if (text != null) node.textContent = text;
  return node;
};

// "You are reading this from a server right now."
const here = $('wls-here');
if (here) {
  here.textContent = location.protocol === 'file:'
    ? 'This page was opened from your disk (file://). The fetch lab below will fail, which is exactly what this lesson is about.'
    : `This page came from a server: ${location.origin}. Scheme ${location.protocol.replace(':', '')}, host ${location.hostname}${location.port ? `, port ${location.port}` : ''}.`;
}

// ── Lab 1: be the server ─────────────────────────────────────────
if ($('wls-server-lab')) {
  const files = $('wls-files');
  const url = $('wls-url');
  const caseBox = $('wls-case');
  const parts = $('wls-parts');
  const steps = $('wls-steps');
  const status = $('wls-status');
  const initial = { files: files.value, url: url.value };

  const run = () => {
    const result = resolveRequest({ url: url.value, files: parseFileList(files.value), caseSensitive: caseBox.checked });
    parts.replaceChildren();
    if (result.parts) {
      for (const [label, value] of [['Scheme', result.parts.scheme], ['Host', result.parts.host], ['Port', result.parts.port], ['Path', result.parts.path], ['Query', result.parts.query], ['Fragment', result.parts.hash]]) {
        if (!value && label !== 'Path') continue;
        const row = el('tr');
        row.append(el('th', { scope: 'row' }, label), el('td').appendChild(el('code', {}, value || '/')).parentNode);
        parts.append(row);
      }
    }
    steps.replaceChildren(...result.steps.map((s) => el('li', {}, s)));
    if (result.listing) steps.append(el('li', {}, `Listing: ${result.listing.join(', ') || '(empty)'}`));
    let line = result.status ? `${result.status} ${REASON[result.status] || ''}` : 'No request was sent';
    if (result.status === 200 && result.file) line += ` · ${result.file} · Content-Type: ${result.type}`;
    if (result.status === 200 && result.listing) line += ' · a file list, not your page';
    if (result.status === 301) line += ` · Location: ${result.location}`;
    status.textContent = line;
    status.dataset.status = result.status ? String(result.status)[0] : 'x';
    $('wls-hint').textContent = result.hint || '';
  };

  [files, url].forEach((input) => input.addEventListener('input', run));
  caseBox.addEventListener('change', run);
  $('wls-reset').addEventListener('click', () => { files.value = initial.files; url.value = initial.url; caseBox.checked = true; run(); });
  document.querySelectorAll('[data-wls-try]').forEach((button) => {
    button.addEventListener('click', () => { url.value = button.dataset.wlsTry; run(); url.focus(); });
  });
  run();
}

// ── Lab 2: a real fetch() ────────────────────────────────────────
if ($('wls-fetch-lab')) {
  const input = $('wls-fetch-url');
  const out = $('wls-fetch-status');
  const body = $('wls-fetch-body');
  const cards = $('wls-fetch-cards');
  const code = $('wls-fetch-code');

  const show = (text) => { out.textContent = text; };
  const render = (list) => {
    cards.replaceChildren();
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const card = el('article', { className: 'wls-card' });
      card.append(el('h4', {}, String(item.title ?? 'Untitled')));
      if (item.kind) card.append(el('p', { className: 'wls-kind' }, String(item.kind)));
      if (item.description) card.append(el('p', {}, String(item.description)));
      cards.append(card);
    }
  };

  const go = async () => {
    const typed = input.value.trim();
    code.textContent = `const response = await fetch('${typed}');\nif (!response.ok) throw new Error(\`\${response.status} for ${typed}\`);\nconst projects = await response.json();`;
    body.textContent = '';
    cards.replaceChildren();
    let target;
    try { target = new URL(typed, location.href); } catch { show('That is not a path or address the browser can read.'); return; }
    if (target.origin !== location.origin) {
      show(`Not sent. ${target.origin} is another site. Its server decides whether other pages may read its data (that permission is called CORS), so this lab only asks this site's own server.`);
      return;
    }
    if (location.protocol === 'file:') {
      show('Blocked: this page was opened with file://, and browsers refuse fetch() from file pages. Start a server and try again.');
      return;
    }
    show('Asking the server…');
    const started = performance.now();
    try {
      const response = await fetch(target, { cache: 'no-store' });
      const ms = Math.round(performance.now() - started);
      const type = response.headers.get('content-type') || '(none)';
      const text = await response.text();
      body.textContent = text.length > 900 ? `${text.slice(0, 900)}\n… (${text.length} characters in all)` : text;
      if (!response.ok) {
        show(`${response.status} ${response.statusText || REASON[response.status] || ''} in ${ms} ms. response.ok is false, so the code above stops here: check the path, its capital letters, and which folder it is relative to.`);
        return;
      }
      if (!/json/.test(type)) {
        show(`${response.status} OK in ${ms} ms, but Content-Type is ${type}, not JSON. response.json() would fail on this.`);
        return;
      }
      let data;
      try { data = JSON.parse(text); } catch (error) {
        show(`${response.status} OK, but the file is not valid JSON: ${error.message}. Look for a trailing comma or single quotes.`);
        return;
      }
      const count = Array.isArray(data) ? `${data.length} item${data.length === 1 ? '' : 's'}` : 'one object';
      show(`${response.status} OK in ${ms} ms · Content-Type: ${type} · ${count}. The cards below were built from the data, not written in the HTML.`);
      render(data);
    } catch (error) {
      show(`The request never got an answer (${error.message}). Is the server still running?`);
    }
  };

  $('wls-fetch-go').addEventListener('click', go);
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); go(); } });
  document.querySelectorAll('[data-wls-fetch]').forEach((button) => {
    button.addEventListener('click', () => { input.value = button.dataset.wlsFetch; go(); });
  });
}
