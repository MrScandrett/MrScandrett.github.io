(function () {
  'use strict';
  var scriptUrl = document.currentScript.src;
  var payload;
  var request;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function render(panel, module) {
    var body = panel.querySelector('.module-glossary-body');
    body.replaceChildren();
    body.appendChild(element('p', '', 'Terminology from all ' + module.lessonCount + ' lessons in this module, across every grade and chapter.'));
    var label = element('label', 'module-glossary-search', 'Find a term');
    var input = element('input');
    input.type = 'search';
    input.placeholder = 'Search terms, aliases, or definitions';
    label.appendChild(input);
    body.appendChild(label);
    var status = element('p', 'module-glossary-status');
    status.setAttribute('role', 'status');
    body.appendChild(status);
    var list = element('dl', 'module-glossary-list');
    var rows = module.terms.map(function (entry) {
      var row = element('div', 'module-glossary-entry');
      var term = element('dt', '', entry.term + (entry.sense ? ' · ' + entry.sense : ''));
      row.appendChild(term);
      var definition = element('dd', '', entry.definition);
      if (entry.aliases.length) definition.appendChild(element('p', 'module-glossary-aliases', 'Also called: ' + entry.aliases.join(', ')));
      var links = element('ul', 'module-glossary-lessons');
      links.setAttribute('aria-label', 'Lessons using ' + entry.term);
      entry.lessons.forEach(function (lesson) {
        var item = element('li');
        var link = element('a', '', lesson.title);
        link.href = lesson.href;
        item.appendChild(link);
        links.appendChild(item);
      });
      definition.appendChild(links);
      row.appendChild(definition);
      list.appendChild(row);
      return { node: row, text: [entry.term, entry.sense || '', entry.aliases.join(' '), entry.definition].join(' ').toLocaleLowerCase() };
    });
    body.appendChild(list);
    function filter() {
      var query = input.value.trim().toLocaleLowerCase();
      var count = 0;
      rows.forEach(function (row) {
        row.node.hidden = query !== '' && row.text.indexOf(query) === -1;
        if (!row.node.hidden) count++;
      });
      status.textContent = query ? count + ' of ' + rows.length + ' terms' + (count ? '' : ' — try another search.') : rows.length + ' terms · A–Z';
    }
    input.addEventListener('input', filter);
    filter();
    panel.querySelector('.module-glossary-count').textContent = module.terms.length + ' terms';
    panel.dataset.loaded = 'true';
  }

  document.querySelectorAll('.module-section').forEach(function (section) {
    var drawer = section.querySelector('.module-drawer');
    if (!drawer) return;
    var panel = element('details', 'module-glossary');
    panel.id = section.id + '-glossary';
    var summary = element('summary');
    summary.appendChild(element('span', '', 'Full module glossary'));
    summary.appendChild(element('span', 'module-glossary-count', 'All chapters'));
    panel.appendChild(summary);
    var body = element('div', 'module-glossary-body');
    panel.appendChild(body);
    drawer.appendChild(panel);
    panel.addEventListener('toggle', function () {
      if (!panel.open || panel.dataset.loaded || panel.dataset.loading) return;
      panel.dataset.loading = 'true';
      body.textContent = 'Loading module glossary…';
      if (!request) request = fetch(new URL('../../../data/module-glossaries.json', scriptUrl)).then(function (response) {
        if (!response.ok) throw new Error('Glossary request failed');
        return response.json();
      }).then(function (data) { payload = data; return data; }).catch(function (error) { request = null; throw error; });
      request.then(function () {
        if (!payload.modules[section.id]) throw new Error('Module glossary missing');
        render(panel, payload.modules[section.id]);
      }).catch(function () {
        body.textContent = 'The glossary could not load. Close and reopen this panel to retry.';
      }).finally(function () { delete panel.dataset.loading; });
    });
  });
})();
