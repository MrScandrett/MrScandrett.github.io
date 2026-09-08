(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if ($('path-lab')) {
    const answers = ['style.css', 'images/logo.svg', '../index.html', '../images/logo.svg'];
    $('path-check').addEventListener('click', () => {
      const expected = answers[Number($('path-question').value)];
      const value = $('path-answer').value.trim().replace(/^\.\//, '');
      $('path-feedback').textContent = value === expected
        ? `Correct: ${expected}. The route starts in the current HTML file’s folder.`
        : `Try again. ${Number($('path-question').value) > 1 ? 'Start with ../ to leave pages, then name the destination.' : 'Both destinations are inside the site folder. Start with the destination filename or folder.'}`;
    });
    $('path-question').addEventListener('change', () => {
      $('path-answer').value = '';
      $('path-feedback').textContent = 'Trace from the current HTML file’s folder. Then check your route.';
    });
  }
  if ($('html-editor')) {
    const initial = $('html-editor').value;
    const render = () => {
      const value = $('html-editor').value;
      const parsed = new DOMParser().parseFromString(value, 'text/html');
      const headingCount = parsed.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
      $('html-preview').srcdoc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{font:18px/1.6 system-ui;padding:1rem;color:#172536;background:#fff;overflow-wrap:anywhere}a{color:#075985}</style></head><body>${value}</body></html>`;
      $('html-feedback').textContent = `${headingCount} heading${headingCount === 1 ? '' : 's'}; ${parsed.querySelector('main') ? 'main landmark found' : 'no main landmark yet'}. ${headingCount && parsed.querySelector('main') ? 'Now check whether the headings describe a sensible outline. This count is a guide, not an HTML validator.' : 'Try a main element containing an h1, then a section with an h2.'}`;
    };
    $('html-run').addEventListener('click', render);
    $('html-reset').addEventListener('click', () => { $('html-editor').value = initial; render(); });
    render();
  }
  if ($('css-preview')) {
    const update = () => {
      const columns = $('css-columns').value;
      const grid = columns === 'auto' ? 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))' : `repeat(${columns}, minmax(0, 1fr))`;
      const gap = `${$('css-gap').value}px`;
      const width = `${$('css-width').value}%`;
      Object.assign($('css-preview').style, { display: 'grid', gridTemplateColumns: grid, gap, width });
      $('css-gap-value').textContent = gap;
      $('css-width-value').textContent = width;
      $('css-generated').textContent = `.cards {\n  display: grid;\n  grid-template-columns: ${grid};\n  gap: ${gap};\n}`;
      $('css-feedback').textContent = columns === 'auto' ? 'Auto-fit changes the column count when the available width changes.' : `The grid keeps ${columns} column${columns === '1' ? '' : 's'} even when the preview gets narrow. Compare the text wrapping.`;
    };
    ['css-columns', 'css-gap', 'css-width'].forEach((id) => $(id).addEventListener('input', update));
    update();
  }
  if ($('js-search')) {
    const cards = [...document.querySelectorAll('[data-lab-project]')];
    const update = () => {
      const term = $('js-search').value.trim().toLowerCase();
      let visible = 0;
      const trace = [`Normalized term: ${JSON.stringify(term)}`];
      cards.forEach((card) => {
        const matches = card.textContent.toLowerCase().includes(term);
        card.hidden = !matches;
        if (matches) visible += 1;
        trace.push(`${card.querySelector('h3').textContent}: matches = ${matches}, hidden = ${!matches}`);
      });
      $('js-count').textContent = `${visible} of ${cards.length} projects shown${visible === 0 ? ' — try a different search.' : '.'}`;
      $('js-trace').textContent = trace.join('\n');
    };
    $('js-search').addEventListener('input', update);
    $('js-clear').addEventListener('click', () => { $('js-search').value = ''; update(); $('js-search').focus(); });
    update();
  }
})();
