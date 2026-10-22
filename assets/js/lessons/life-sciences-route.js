/* A compact route for long life-science lessons without an existing section guide. */
(() => {
  const title = document.querySelector('h1');
  if (!title) return;

  const content = title.closest('main') || document.querySelector('main') ||
    title.closest('.ll-sim') || title.closest('.cl-page') || document.body;
  const headings = [...content.querySelectorAll('h2')].filter((heading) =>
    heading.getClientRects().length && !heading.closest('nav, dialog, [aria-hidden="true"]')
  );
  if (headings.length < 3) return;

  // Existing chapter links and hero shortcuts already provide this route.
  const localLinks = [...document.querySelectorAll('nav:not(.site-nav) a[href^="#"], main a[href^="#"]')];
  if (localLinks.length >= 3) return;

  const usedIds = new Set([...document.querySelectorAll('[id]')].map((node) => node.id));
  headings.forEach((heading, index) => {
    heading.classList.add('life-route-target');
    if (heading.id) return;
    let id = `life-section-${index + 1}`;
    while (usedIds.has(id)) id += '-next';
    heading.id = id;
    usedIds.add(id);
  });
  const activity = headings.slice(1).find((heading) =>
    /\b(lab|simulator|simulation|challenge|interactive|game|experiment|predict.+test)\b/i.test(heading.textContent) ||
    /\b(experiment|lab|simulator)\b/i.test(heading.closest('section')?.className || '')
  );
  const guide = document.createElement('nav');
  guide.className = 'life-route';
  guide.setAttribute('aria-label', 'Lesson guide');

  const start = document.createElement('a');
  start.className = 'life-route-start';
  start.href = `#${headings[0].id}`;
  const startLabel = document.createElement('span');
  startLabel.className = 'life-route-kicker';
  startLabel.textContent = 'Start here';
  const startName = document.createElement('strong');
  startName.textContent = /^start here$/i.test(headings[0].textContent.trim())
    ? 'Open the first section' : headings[0].textContent.trim();
  start.append(startLabel, startName);
  guide.append(start);

  if (activity && activity !== headings[0]) {
    const lab = document.createElement('a');
    lab.className = 'life-route-lab';
    lab.href = `#${activity.id}`;
    lab.textContent = 'Go to activity';
    lab.setAttribute('aria-label', `Go to activity: ${activity.textContent.trim()}`);
    guide.append(lab);
  }

  const details = document.createElement('details');
  details.className = 'life-route-sections';
  const summary = document.createElement('summary');
  summary.textContent = 'Sections';
  const list = document.createElement('ol');
  headings.forEach((heading) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    link.addEventListener('click', () => { details.open = false; });
    item.append(link);
    list.append(item);
  });
  details.append(summary, list);
  guide.append(details);
  if (content.contains(title)) title.insertAdjacentElement('afterend', guide);
  else content.prepend(guide);
})();
