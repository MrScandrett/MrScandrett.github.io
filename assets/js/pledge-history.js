/* Daily Library of Congress archive with saved highlights and an online fallback.
   Use local dates, never UTC date slicing; remote text is never inserted as HTML. */
(() => {
  'use strict';
  const input = document.getElementById('history-date');
  const result = document.getElementById('history-day-result');
  if (!input || !result) return;
  const pad = n => String(n).padStart(2, '0');
  const localDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const archive = fetch(new URL('../data/american-history-days.json', document.currentScript.src))
    .then(response => { if (!response.ok) throw new Error('Archive unavailable'); return response.json(); })
    .catch(() => null);
  const remoteDays = new Map();
  async function loadRemoteDay(source) {
    if (!remoteDays.has(source)) {
      remoteDays.set(source, fetch(`${source}?fo=json`, {signal: AbortSignal.timeout(8000)})
        .then(response => { if (!response.ok) throw new Error('Daily archive unavailable'); return response.json(); })
        .then(data => {
          const entries = (data.item?.articles || []).map(html => {
            // Read an inert template rather than a document with active image URLs.
            const template = document.createElement('template');
            template.innerHTML = html;
            template.content.querySelectorAll('.icon, script, style').forEach(node => node.remove());
            const title = template.content.querySelector('h1')?.textContent.trim();
            const full = template.content.querySelector('p')?.textContent.replace(/\s+/g, ' ').trim();
            const excerpt = full?.length > 550 ? `${full.slice(0, 550).replace(/\s+\S*$/, '')}…` : full;
            return title && excerpt ? {title, excerpt} : null;
          }).filter(Boolean);
          return entries.length ? {source, entries} : null;
        }).catch(() => null));
    }
    return remoteDays.get(source);
  }
  let latestRequest = 0;
  async function render() {
    if (!input.value || !input.validity.valid) return;
    const request = ++latestRequest;
    const selected = input.value;
    const [, month, day] = selected.split('-').map(Number);
    const data = await archive;
    if (request !== latestRequest) return;
    const source = `https://www.loc.gov/item/today-in-history/${months[month - 1]}-${pad(day)}/`;
    const date = new Date(2000, month - 1, day, 12);
    const label = date.toLocaleDateString(undefined, {month: 'long', day: 'numeric'});
    result.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = `${label} · From the daily archive`;
    result.append(heading);
    let saved = data?.days?.[`${pad(month)}-${pad(day)}`];
    if (!saved) {
      const loading = document.createElement('p');
      loading.textContent = `Looking up the ${label} Library of Congress archive…`;
      result.append(loading);
      saved = await loadRemoteDay(source);
      if (request !== latestRequest) return;
      loading.remove();
    }
    const entries = saved?.entries || [];
    for (const entry of entries) {
      const article = document.createElement('article');
      const title = document.createElement('h4');
      title.textContent = entry.title;
      const excerpt = document.createElement('p');
      excerpt.textContent = entry.excerpt;
      article.append(title, excerpt);
      result.append(article);
    }
    if (!entries.length) {
      const note = document.createElement('p');
      note.textContent = 'The saved article is unavailable. Open the Library of Congress archive for this calendar date.';
      result.append(note);
    }
    const link = document.createElement('a');
    link.href = saved?.source || source;
    link.textContent = entries.length ? `Explore the ${label} source & primary documents →` : `Open the ${label} Library of Congress archive →`;
    result.append(link);
    if (entries.length) {
      const credit = document.createElement('p');
      credit.className = 'history-source';
      credit.textContent = saved.credit || 'Source: Library of Congress, Today in History. Article titles and introductory excerpts.';
      result.append(credit);
    }
    const prompt = document.createElement('p');
    prompt.className = 'history-question';
    prompt.textContent = 'Discuss: What changed? Who was affected? Which primary source would help us investigate?';
    result.append(prompt);
  }
  input.value = localDate();
  document.getElementById('history-date-form').addEventListener('submit', event => { event.preventDefault(); render(); });
  document.getElementById('history-today-button').addEventListener('click', () => { input.value = localDate(); render(); });
  // Refresh the date after midnight if the class left the tab open on Today.
  let lastToday = localDate();
  setInterval(() => {
    const today = localDate();
    if (today !== lastToday && input.value === lastToday) { input.value = today; render(); }
    lastToday = today;
  }, 60000);
  render();
})();
