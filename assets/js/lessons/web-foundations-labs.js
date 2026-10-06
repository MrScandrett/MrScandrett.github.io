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
    const vague = /^(click here|here|read more|more|link|this|this link|go|learn more)$/i;
    // Each check returns [status, message]: 'pass', 'fail' (something to repair) or 'note'.
    const audit = (doc) => {
      const results = [];
      const mains = doc.querySelectorAll('main').length;
      results.push(mains === 1 ? ['pass', 'One <main> landmark holds the unique content.']
        : mains ? ['fail', `${mains} <main> elements. A page gets exactly one.`]
        : ['fail', 'No <main> landmark yet. Wrap the page’s own content in <main>…</main>.']);
      const headings = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')];
      const h1s = headings.filter((h) => h.tagName === 'H1').length;
      results.push(h1s === 1 ? ['pass', 'Exactly one <h1> names the page.']
        : h1s ? ['fail', `${h1s} <h1> headings. Keep one for the page title and make the others <h2>.`]
        : ['fail', 'No <h1>. Give the page one heading that says what it is.']);
      const skips = [];
      headings.forEach((h, i) => {
        const level = Number(h.tagName[1]);
        const previous = i ? Number(headings[i - 1].tagName[1]) : 0;
        if (level > previous + 1) skips.push(`<${h.tagName.toLowerCase()}> “${h.textContent.trim().slice(0, 30)}” comes after ${previous ? `an <h${previous}>` : 'no heading at all'}`);
      });
      if (headings.length) {
        results.push(skips.length ? ['fail', `Skipped heading level: ${skips.join('; ')}. Go down one level at a time.`]
          : ['pass', 'Heading levels go down one step at a time.']);
      }
      results.push(doc.querySelector('ul li, ol li') ? ['pass', 'A real list (<ul> or <ol> with <li> items) is present.']
        : ['fail', 'No list yet. Two or more projects are a list: use <ul> and <li>.']);
      const images = [...doc.querySelectorAll('img')];
      const noAlt = images.filter((img) => !img.hasAttribute('alt'));
      const fileAlt = images.filter((img) => /\.(png|jpe?g|gif|svg|webp)\b|^(an? )?(image|picture|photo|img|graphic)( of\b|$)/i.test(img.getAttribute('alt') || ''));
      if (images.length) {
        results.push(noAlt.length ? ['fail', `${noAlt.length} of ${images.length} image${images.length === 1 ? '' : 's'} ${noAlt.length === 1 ? 'has' : 'have'} no alt attribute. Add alt text, or alt="" if it is decoration.`]
          : fileAlt.length ? ['fail', `Alt text “${fileAlt[0].getAttribute('alt')}” reads like a filename or says “image”. Say what the picture communicates.`]
          : ['pass', 'Every image has an alt attribute.']);
      }
      const links = [...doc.querySelectorAll('a')];
      const weak = links.filter((a) => vague.test(a.textContent.trim()) || !a.textContent.trim());
      const nowhere = links.filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#');
      if (links.length) {
        results.push(weak.length ? ['fail', `Link text “${weak[0].textContent.trim() || '(empty)'}” makes no sense on its own. Put the destination in the link words.`]
          : ['pass', 'Every link’s words say where it goes.']);
        if (nowhere.length) results.push(['note', `${nowhere.length} link${nowhere.length === 1 ? ' points' : 's point'} to "#" or nowhere. Fine for practice; give ${nowhere.length === 1 ? 'it' : 'them'} a real href in your site.`]);
      }
      const clickables = doc.querySelectorAll('div[onclick], span[onclick]');
      if (clickables.length) results.push(['fail', `A <${clickables[0].tagName.toLowerCase()}> with onclick is not reachable by keyboard. Use <a href> to go somewhere or <button> to do something.`]);
      return { results, headings };
    };
    const outline = (headings) => headings.length
      ? headings.map((h) => `${'  '.repeat(Number(h.tagName[1]) - 1)}${h.tagName.toLowerCase()}  ${h.textContent.trim() || '(empty heading)'}`).join('\n')
      : '(no headings — a screen reader user has nothing to jump between)';
    const render = () => {
      const value = $('html-editor').value;
      const parsed = new DOMParser().parseFromString(value, 'text/html');
      $('html-preview').srcdoc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{font:18px/1.6 system-ui;padding:1rem;color:#172536;background:#fff;overflow-wrap:anywhere}a{color:#075985}</style></head><body>${value}</body></html>`;
      const { results, headings } = audit(parsed);
      const fixes = results.filter(([status]) => status === 'fail').length;
      $('html-feedback').textContent = fixes ? `${fixes} thing${fixes === 1 ? '' : 's'} to repair.` : 'Every check passes. Now read the outline aloud: does it make sense as a table of contents?';
      $('html-report').replaceChildren(...results.map(([status, message]) => {
        const li = document.createElement('li');
        li.className = `is-${status}`;
        li.textContent = message;
        return li;
      }));
      $('html-outline').textContent = outline(headings);
    };
    $('html-run').addEventListener('click', render);
    $('html-reset').addEventListener('click', () => { $('html-editor').value = initial; render(); });
    render();
  }
  if ($('host-lab')) {
    const initialHtml = $('host-html').value;
    const initialFiles = $('host-files').value;
    // Resolve a relative reference written in a page at the site root to a
    // repository path, or null if it climbs out of the site.
    const resolve = (ref) => {
      const parts = [];
      for (const part of decodeURIComponent(ref.split(/[?#]/)[0]).split('/')) {
        if (part === '..') { if (!parts.length) return null; parts.pop(); }
        else if (part && part !== '.') parts.push(part);
      }
      return parts.join('/');
    };
    // Each verdict: [works on the laptop?, works on GitHub Pages?, why].
    const judge = (ref, files) => {
      if (/^[a-z]:\\|\\|^file:/i.test(ref)) return [true, false, 'A path on your own drive. Only your computer has that folder; write it relative to this page.'];
      if (ref.startsWith('/')) return [true, false, `On GitHub Pages “/” is the top of your-name.github.io, not your project folder, so this asks for ${ref} outside the repository. Drop the leading slash.`];
      let path;
      try { path = resolve(ref); } catch { return [false, false, 'This path has a stray % sign, so the browser cannot read it.']; }
      if (path === null) return [false, false, 'Too many ../ — this climbs above the top of your site.'];
      if (files.includes(path)) return [true, true, /\s/.test(path) ? 'Works, but the space becomes %20 in the address. Rename with hyphens when you can.' : 'Matches a file exactly, capital letters and all.'];
      const caseTwin = files.find((file) => file.toLowerCase() === path.toLowerCase());
      if (caseTwin) return [true, false, `The repository has ${caseTwin}. Your laptop ignores the difference in capitals; the server does not. Make the name and the link match exactly.`];
      return [false, false, `No file at ${path}. Check the spelling, the folder, and the extension.`];
    };
    const cell = (ok) => {
      const td = document.createElement('td');
      td.className = ok ? 'is-ok' : 'is-broken';
      td.textContent = ok ? 'Loads' : '404';
      return td;
    };
    const run = () => {
      const files = $('host-files').value.split('\n').map((line) => line.trim().replace(/^\.?\//, '')).filter(Boolean);
      const doc = new DOMParser().parseFromString($('host-html').value, 'text/html');
      const refs = [...doc.querySelectorAll('[href], [src]')]
        .map((el) => el.getAttribute('href') ?? el.getAttribute('src'))
        .filter((ref) => ref && !/^(https?:|mailto:|tel:|data:|#)/i.test(ref));
      const rows = refs.map((ref) => {
        const [laptop, server, why] = judge(ref, files);
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row';
        const code = document.createElement('code');
        code.textContent = ref;
        th.append(code);
        const reason = document.createElement('td');
        reason.textContent = why;
        tr.append(th, cell(laptop), cell(server), reason);
        return { tr, server };
      });
      $('host-rows').replaceChildren(...rows.map((row) => row.tr));
      const entry = files.includes('index.html') ? null
        : files.find((file) => file.toLowerCase() === 'index.html')
          ? `Rename ${files.find((file) => file.toLowerCase() === 'index.html')} to index.html, all lowercase.`
          : `There is no index.html at the top level, so your site address shows a 404. Rename your home page${files.find((file) => !file.includes('/') && file.endsWith('.html')) ? ` (${files.find((file) => !file.includes('/') && file.endsWith('.html'))})` : ''} to index.html.`;
      const broken = rows.filter((row) => !row.server).length;
      $('host-feedback').textContent = [
        entry ? `Entry page: ${entry}` : 'Entry page: index.html is at the top level.',
        refs.length ? (broken ? `${broken} of ${refs.length} references break once the site is online.` : `All ${refs.length} references load on GitHub Pages.`) : 'No local references found yet.',
        !entry && !broken && refs.length ? 'Ready to commit and push.' : ''
      ].filter(Boolean).join(' ');
    };
    $('host-run').addEventListener('click', run);
    $('host-reset').addEventListener('click', () => { $('host-html').value = initialHtml; $('host-files').value = initialFiles; run(); });
    run();
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
