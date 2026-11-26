import { acts, cities, eras, feasts, holyPlaces, holyWeek, journeys, parables, translations, witnesses } from './bible-lab-data.mjs';

const main = document.querySelector('[data-bible-lesson]');
const element = (tag, className, value) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value) node.textContent = value;
  return node;
};

function button(label, action) {
  const node = element('button', '', label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

function mount(title, instructions) {
  const lab = element('section', 'bpl-card bible-lab');
  lab.id = 'bible-signature-lab';
  lab.setAttribute('aria-labelledby', 'bible-lab-title');
  const heading = element('h2', '', title);
  heading.id = 'bible-lab-title';
  lab.append(heading, element('p', '', instructions));
  main.querySelector('.bpl-learning-flow').after(lab);
  const link = element('a', '', 'Signature lab');
  link.href = '#' + lab.id;
  main.querySelector('.bpl-learning-flow').append(link);
  return lab;
}

function select(label, options, action) {
  const wrapper = element('label', 'bible-lab-select', label);
  const input = element('select');
  input.setAttribute('aria-label', label);
  input.replaceChildren(...options.map((option, index) => new Option(option, index)));
  input.addEventListener('change', () => action(Number(input.value)));
  wrapper.append(input);
  return { wrapper, input };
}

function steps(host, labels, label, render, { wrap = false, play = false } = {}) {
  let index = 0;
  let timer = null;
  const controls = element('div', 'bible-lab-controls');
  const output = element('div', 'bible-lab-output');
  const picker = select(label, labels, go);
  const previous = button('← Previous', () => go(index - 1));
  const next = button('Next →', () => go(index + 1));
  const playback = button('Play route', () => {
    if (timer) {
      stop();
      return;
    }
    if (index === labels.length - 1) show(0);
    playback.textContent = 'Pause route';
    timer = setInterval(() => {
      show(index + 1);
      if (index === labels.length - 1) stop();
    }, 2500);
  });

  function stop() {
    clearInterval(timer);
    timer = null;
    playback.textContent = 'Play route';
  }

  function go(value) {
    stop();
    show(value);
  }

  function show(value) {
    index = (value + labels.length) % labels.length;
    picker.input.value = index;
    previous.disabled = !wrap && index === 0;
    next.disabled = !wrap && index === labels.length - 1;
    render(output, index);
  }

  controls.append(picker.wrapper, previous, next);
  if (play) controls.append(playback);
  host.append(controls, output);
  show(0);
  return stop;
}

function graphic(width, height, label, contents, className = '') {
  const frame = element('div', 'bible-lab-graphic');
  frame.innerHTML = `<svg class="${className}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">${contents}</svg>`;
  return frame;
}

function detail(title, context, rows) {
  const article = element('article', 'bible-lab-detail');
  article.setAttribute('aria-live', 'polite');
  article.append(element('p', 'bible-lab-context', context), element('h3', '', title));
  const list = element('dl');
  for (const [label, description] of rows) {
    list.append(element('dt', '', label), element('dd', '', description));
  }
  article.append(list);
  return article;
}

function caption(value) {
  return element('p', 'bible-lab-caption', value);
}

function illustration(output, visual, description, article) {
  const figure = element('figure', 'bible-lab-figure');
  figure.append(visual, element('figcaption', 'bible-lab-caption', description));
  output.replaceChildren(figure, article);
  output.classList.add('bible-lab-layout');
}

function tabernacle() {
  const stations = [
    ['The camp', 'Numbers 2:1–34', 'Tribes camp around the sanctuary. The tents here are schematic. The court uses the proportions specified in Exodus.', [112, 54]],
    ['The outer court', 'Exodus 27:9–19', 'The court is 100 by 50 cubits. Its enclosure is 5 cubits high. The entrance faces east and is 20 cubits wide.', [100, 25]],
    ['Bronze altar', 'Exodus 27:1–8', 'The altar is 5 by 5 cubits and 3 cubits high. It stands outside the tent, near the entrance to the courtyard.', [78, 25]],
    ['Basin', 'Exodus 30:17–21', 'The priests wash here. Exodus places the basin between the altar and the tent and gives no dimensions for it.', [58, 25]],
    ['The Holy Place', 'Exodus 26:15–37; 30:1–10', 'The lampstand stands on the south side and the table on the north. The incense altar stands before the inner veil.', [32, 25]],
    ['The Most Holy Place', 'Exodus 26:31–34; Leviticus 16:2–17', 'Behind the veil is the ark. Leviticus 16 describes the high priest’s entry on the Day of Atonement.', [17, 25]]
  ];
  const furniture = ['Lampstand · south', 'Table · north', 'Incense altar · before the veil'];
  const lab = mount('Walk through the Tabernacle', 'Travel west from the camp toward the ark. Select a stop, switch views, or inspect furnishings inside the Holy Place.');
  const views = select('View', ['3D cutaway', 'Floor plan'], (index) => {
    plan = index === 1;
    redraw();
  });
  let plan = false;
  let redraw = () => {};
  lab.append(views.wrapper);
  steps(lab, stations.map(([title]) => title), 'Architectural layer', (output, index) => {
    let selected = -1;
    redraw = () => {
      const project = (x, y, z = 0) => plan ? [80 + x * 4.5, 55 + y * 4.2] : [205 + x * 4 - y * 2.55, 42 + x * 0.94 + y * 2.4 - z * 4.6];
      const poly = (vertices, color, cls = '') => `<polygon class="${cls}" fill="${color}" points="${vertices.map((v) => project(...v).join(',')).join(' ')}"/>`;
      const box = (x, y, w, d, h, color) => [
        !plan && poly([[x, y + d], [x + w, y + d], [x + w, y + d, h], [x, y + d, h]], color, 'bible-lab-side'),
        !plan && poly([[x + w, y], [x + w, y + d], [x + w, y + d, h], [x + w, y, h]], color, 'bible-lab-end'),
        poly([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]], color)
      ].filter(Boolean).join('');
      const [title, reference, copy, coordinate] = stations[index];
      const focalPoints = [[37, 28], [37, 21], [24, 25]];
      const [x, y] = project(...(selected < 0 ? coordinate : focalPoints[selected]));
      const walls = box(0, 0, 100, 0.6, 5, '#f6e8ca') + box(0, 49.4, 100, 0.6, 5, '#f6e8ca')
        + box(0, 0, 0.6, 50, 5, '#f6e8ca') + box(99.4, 0, 0.6, 15, 5, '#f6e8ca') + box(99.4, 35, 0.6, 15, 5, '#f6e8ca');
      const camp = [[108, 4], [108, 13], [109, 36], [110, 47], [17, 55], [34, 55], [52, 55], [72, 55], [92, 55]].map(([a,b]) => box(a, b, 5, 4, 3, '#a76345')).join('');
      const tent = index < 4
        ? box(12, 20, 30, 10, 10, '#763f67')
        : box(12, 20, 10, 10, 0.2, '#b583bd') + box(22, 20, 20, 10, 0.2, '#e1b972')
          + box(21.7, 20, 0.6, 10, 2, '#763f67')
          + box(36, 27.4, 2, 1.2, 2, '#d6a034') + box(36, 20.5, 2, 1, 1.5, '#d6a034')
          + box(23.5, 24.5, 1, 1, 2, '#d6a034') + box(15.75, 24.25, 2.5, 1.5, 1.5, '#d6a034');
      const outside = box(75.5, 22.5, 5, 5, 3, '#af623f') + box(57, 24, 2, 2, 1, '#567584');
      const drawing = `${box(0, 0, 100, 50, 0, '#e8d1a0')}${camp}${walls}${tent}${outside}
        <circle cx="${x}" cy="${y}" r="10" class="bible-lab-marker"/>
        <text x="28" y="306">West · inner rooms</text><text x="650" y="306" text-anchor="end">East · entrance</text>`;
      const explanations = ['The lampstand provides light in the tent (Exodus 25:31–40; 26:35).', 'The table holds the bread of the Presence (Exodus 25:23–30; 26:35).', 'Aaron burns fragrant incense at the altar before the veil (Exodus 30:1–10).'];
      const card = detail(title, reference, [['What to notice', copy]]);
      if (index === 4) {
        const inspector = select('Furnishing', ['Choose an object', ...furniture], (i) => {
          selected = i - 1;
          redraw();
          output.querySelector('.bible-lab-detail select').focus();
        });
        inspector.input.value = selected + 1;
        card.append(inspector.wrapper);
        if (selected >= 0) card.append(element('p', '', explanations[selected]));
      }
      illustration(output, graphic(680, 320, `Tabernacle ${plan ? 'floor plan' : 'cutaway'} highlighting ${title}`, drawing),
        'Court and altar proportions follow Exodus 27. The 30 × 10 cubit tent, its 20 + 10 cubit room division, and furnishing positions combine textual clues with customary reconstruction.', card);
    };
    redraw();
  });
}

function connections(route) {
  let from = route.start;
  return route.steps.map((step) => {
    const places = [step.from || from, ...step.path];
    from = places.at(-1);
    return places;
  });
}

function routeLab(network) {
  const lab = mount(network ? 'Watch the Acts network grow' : 'Follow Paul’s missionary journeys',
    network ? 'Advance through Acts to see how new cities and connections grow out of earlier ones.' : 'Choose a journey, then step through the legs or play the route. Compare the places with the people and letters tied to them.');
  const host = element('div');
  const engine = window.EarthEngine;
  const width = 780;
  const height = 415;
  const extent = network ? [[10, 28], [38, 45]] : [[20, 29], [38, 43]];
  const projection = engine.projection('equirectangular', {
    geometry: { type: 'MultiPoint', coordinates: extent },
    extent: [[18, 18], [width - 18, height - 18]]
  });
  let land = '';
  let mapLabel = 'Natural Earth 1:50m reference coastlines (public domain).';
  let refreshMap = () => {};
  let stop = () => {};
  if (!network) {
    lab.append(select('Journey', journeys.map((route) => route.title), (index) => showRoute(journeys[index])).wrapper);
  }
  lab.append(host);
  showRoute(network ? acts : journeys[0]);
  engine.load().then((data) => {
    land = engine.path(projection, data.land);
    refreshMap();
  }).catch(() => {
    mapLabel = 'Reference coastlines could not load. The city positions and route links remain available.';
    refreshMap();
  });

  function showRoute(route) {
    stop();
    host.replaceChildren();
    const legs = connections(route);
    const labels = legs.map((places) => places.join(' → '));
    stop = steps(host, labels, network ? 'Story stop' : 'Travel leg', (output, index) => {
      const step = route.steps[index];
      const leg = legs[index];
      const points = leg.map((name) => cities[name]);
      const km = points.slice(1).reduce((sum, point, i) => sum + window.d3.geoDistance(points[i], point) * 6371, 0);
      const rows = network
        ? [['What happens', step.event], ['Network connection', step.connection]]
        : [['Companions', step.company], ['What happens', step.event], ['Churches and letters', step.letter], ['Distance via shown stops', `About ${Math.round(km / 10) * 10} km, measured between markers. Actual travel was often longer.`]];
      const article = detail(labels[index], step.ref, rows);
      let animate = true;
      refreshMap = () => {
        const visited = new Set(legs.slice(0, index + 1).flat());
        const available = network ? [...visited] : [...new Set(legs.flat())];
        const active = new Set(leg);
        const links = legs.slice(0, index + 1).map((places, i) => places.length > 1
          ? `<polyline class="bible-lab-route ${i === index ? 'is-active' : ''} ${i === index && animate ? 'is-drawing' : ''}" pathLength="1" points="${places.map((name) => projection(cities[name]).join(',')).join(' ')}"/>` : '').join('');
        const markers = available.map((name) => {
          const [x, y] = projection(cities[name]);
          return `<circle class="${active.has(name) ? 'bible-lab-marker' : 'bible-lab-dot'}" cx="${x}" cy="${y}" r="${active.has(name) ? 6 : 3.6}"><title>${name}</title></circle>`;
        }).join('');
        const places = [...new Set([leg[0], leg.at(-1)])].map((name, i) => {
          const [x, y] = projection(cities[name]);
          const align = x > width * .72 ? 'end' : 'start';
          return `<text class="bible-lab-map-label" x="${x + (align === 'end' ? -8 : 8)}" y="${y + (i ? 19 : -10)}" text-anchor="${align}">${name}</text>`;
        }).join('');
        const visual = graphic(width, height, `Map highlighting ${labels[index]}`, `<path class="bible-lab-land" d="${land}"/>${links}${markers}${places}`, 'bible-lab-geography');
        illustration(output, visual, `${mapLabel} Lines connect selected places approximately. They do not trace ancient roads, sailing tracks, or borders.`, article);
        animate = false;
      };
      refreshMap();
    }, { play: true });
  }
}

function kingdoms() {
  const lab = mount('Kings, prophets, and empires on one timeline', 'Choose a date to align a ruler or prophet with the event, empire, and biblical texts. Compare the fall of Samaria and the fall of Jerusalem.');
  const x = (year) => 56 + (940 - year) * 1.47;
  steps(lab, eras.map(({ date, title }) => `${date} · ${title}`), 'Turning point', (output, index) => {
    const era = eras[index];
    const bands = [
      [930, 722, 53, '#8065a5', 'Israel'],
      [930, 586, 87, '#ad6348', 'Judah'],
      [900, 609, 121, '#447480', 'Assyria'],
      [609, 539, 121, '#ac7341', 'Babylon'],
      [539, 510, 121, '#55763e', 'Persia']
    ];
    const ticks = [900, 800, 700, 600, 520].map((year) => `<text x="${x(year)}" y="176" text-anchor="middle">${year}</text>`).join('');
    const labels = { Israel: [78, 'Northern kingdom · Israel'], Judah: [78, 'Southern kingdom · Judah'], Assyria: [129, 'Assyria'], Babylon: [552, 'Babylon'] };
    // Each band is a group that names its own colour as background-color: contrast checkers
    // (pa11y, contrast-guard.js) read CSS backgrounds, not the rect painted under a label.
    const blocks = bands.map(([start, end, y, color, name]) => `<g style="background-color:${color}"><title>${name}</title><rect x="${x(start)}" y="${y}" width="${x(end) - x(start)}" height="23" rx="4" fill="${color}"/>${labels[name] ? `<text x="${labels[name][0]}" y="${y + 17}" class="bible-lab-white">${labels[name][1]}</text>` : ''}</g>`).join('');
    const dots = eras.map(({ year }, i) => `<circle cx="${x(year)}" cy="149" r="${index === i ? 7 : 4}" class="${index === i ? 'bible-lab-marker' : 'bible-lab-dot'}"/>`).join('');
    const drawing = `${blocks}<text x="645" y="114">Persia ↘</text>
      <line x1="${x(era.year)}" y1="38" x2="${x(era.year)}" y2="149" class="bible-lab-cursor"/>${dots}${ticks}<text x="20" y="176">BCE</text>`;
    illustration(output, graphic(740, 194, `Timeline with ${era.date} selected. Israel ends in 722 or 721 BCE and Judah ends in 587 or 586 BCE.`, drawing),
      'Bands show selected periods of power in the region. Dots are spaced by years; several ancient dates are approximate.',
      detail(era.title, era.date, [['Kings and rulers', era.kings], ['Prophets', era.prophets], ['Biblical books and passages', era.books], ['Imperial context', era.empire], ['Exile, return, and other events', era.event]]));
  });
}

function festivals() {
  const lab = mount('Turn the Hebrew calendar', 'Rotate through the observances in Leviticus 23. Compare how harvest, worship, and remembrance meet in the same year.');
  const months = ['Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul', 'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar'];
  steps(lab, feasts.map(({ title }) => title), 'Observance', (output, index) => {
    const feast = feasts[index];
    const wheel = months.map((month, i) => {
      const theta = ((i - feast.month) * 30 - 90) * Math.PI / 180;
      const [x, y] = [210 + 145 * Math.cos(theta), 178 + 135 * Math.sin(theta)];
      return `<circle cx="${x}" cy="${y}" r="${i === feast.month ? 27 : 12}" class="${i === feast.month ? 'bible-lab-marker' : 'bible-lab-dot'}"/><text x="${x}" y="${y + (i === feast.month ? 5 : 28)}" text-anchor="middle">${month}</text>`;
    }).join('');
    const drawing = `<ellipse cx="210" cy="178" rx="145" ry="135" class="bible-lab-wheel"/>
      <text x="210" y="170" text-anchor="middle">${months[feast.month]}</text><text x="210" y="198" text-anchor="middle">${feast.month === 6 ? 'Autumn' : 'Spring / early summer'}</text>${wheel}`;
    illustration(output, graphic(420, 365, `Twelve-month Hebrew calendar with ${months[feast.month]} at the top`, drawing),
      'The wheel starts its biblical month count at Nisan and shows a common year. Hebrew months follow a lunisolar calendar. Leap years add a second Adar, and Gregorian dates vary by year.',
      detail(feast.title, feast.date, [['Season and harvest', feast.season], ['Practice', feast.practice], ['Remembrance', feast.memory], ['Read', feast.ref]]));
  }, { wrap: true });
}

const scriptureCache = new Map();

function reference([book, chapter, start, end]) {
  return `${book} ${chapter}:${start}${end === start ? '' : '–' + end}`;
}

function readPassage(target, verses, version = 'bsb') {
  const [book, chapter, start, end] = verses;
  const slug = book.toLowerCase().replaceAll(' ', '-');
  const key = version + '/' + slug;
  if (!scriptureCache.has(key)) {
    scriptureCache.set(key, fetch(new URL(`../data/bible/${key}.json`, import.meta.url)).then((response) => {
      if (!response.ok) throw new Error('Scripture could not be loaded.');
      return response.json();
    }).catch((error) => {
      scriptureCache.delete(key);
      throw error;
    }));
  }
  target.setAttribute('aria-busy', 'true');
  target.replaceChildren(element('p', '', 'Loading passage…'));
  scriptureCache.get(key).then((bookText) => {
    const lines = bookText[chapter - 1].slice(start - 1, end);
    if (lines.length !== end - start + 1) throw new Error('Scripture could not be loaded.');
    target.replaceChildren(...lines.map((line, i) => {
      const p = element('p', 'bpl-verse');
      p.append(element('sup', '', String(start + i)), element('span', '', line));
      return p;
    }));
  }).catch(() => {
    target.replaceChildren(element('p', '', `Text could not load. Look up ${reference(verses)} in this edition.`));
  }).finally(() => target.setAttribute('aria-busy', 'false'));
}

function prediction(prompt, options, answer, reveal, legend) {
  const box = element('fieldset', 'bible-lab-prediction');
  box.append(element('legend', '', legend), element('p', '', prompt));
  const result = element('div', 'bible-lab-result');
  result.setAttribute('aria-live', 'polite');
  const check = button('Reveal and compare', () => {
    result.replaceChildren(element('p', '', `You chose “${options[selected]}.” The passage supports “${options[answer]}.”`));
    reveal(result);
  });
  check.disabled = true;
  let selected = -1;
  const choices = options.map((option, i) => {
    const label = element('label');
    const radio = element('input');
    radio.type = 'radio';
    radio.name = 'bible-lab-prediction';
    radio.addEventListener('change', () => {
      selected = i;
      check.disabled = false;
      result.replaceChildren();
    });
    label.append(radio, element('span', '', option));
    return label;
  });
  box.append(...choices, check, result);
  return box;
}

function parableStudio() {
  const lab = mount('Predict the next turn', 'Choose a parable, commit to a prediction, and then read Jesus’ ending. Use a detail from the text to explain the surprise.');
  steps(lab, parables.map(({ title }) => title), 'Parable', (output, index) => {
    const story = parables[index];
    const symbols = element('div', 'bible-lab-story');
    symbols.setAttribute('aria-hidden', 'true');
    symbols.replaceChildren(...story.symbols.map((symbol) => element('span', '', symbol)));
    const card = element('article', 'bible-lab-detail');
    card.append(element('h3', '', story.scene), symbols, prediction(story.setup, story.choices, story.answer, (result) => {
      symbols.lastElementChild.textContent = story.reveal;
      const text = element('div');
      result.append(element('h4', '', reference(story.verse) + ' · BSB'), text, element('p', '', story.insight));
      readPassage(text, story.verse);
    }, 'What happens next?'));
    card.addEventListener('change', () => { symbols.lastElementChild.textContent = '?'; });
    output.replaceChildren(card);
  });
}

function manuscripts() {
  const lab = mount('Compare manuscript witnesses and translations', 'Inspect two copies of Mark side by side. Then compare English editions and test what their wording communicates.');
  const panel = element('div', 'bible-lab-comparison');
  const controls = element('div', 'bible-lab-controls');
  const choices = [0, 2];
  function compare() {
    panel.replaceChildren(...choices.map((index) => {
      const witness = witnesses[index];
      const card = detail(witness.title, witness.date, [['What comes next?', witness.next]]);
      const greek = element('p', 'bible-lab-greek', witness.excerpt);
      greek.lang = 'grc';
      const link = element('a', '', 'Manuscript source');
      link.href = witness.source;
      card.querySelector('h3').after(greek);
      card.append(link);
      return card;
    }));
  }
  ['Left witness', 'Right witness'].forEach((label, side) => {
    const picker = select(label, witnesses.map(({ title }) => title), (index) => {
      choices[side] = index;
      compare();
    });
    picker.input.value = choices[side];
    controls.append(picker.wrapper);
  });
  lab.append(element('h3', '', 'Manuscripts · Mark 16:8'), controls, panel,
    caption('The displayed Greek gives the final two words of verse 8 in normalized lowercase, “for they were afraid.” Inspect what follows the shared words. Three witnesses give a sample of the evidence about Mark’s ending.'),
    element('h3', '', 'Translation choices'));
  compare();
  steps(lab, translations.map(({ title }) => title), 'Verse', (output, index) => {
    const item = translations[index];
    const columns = element('div', 'bible-lab-comparison');
    for (const [edition, title] of [['bsb', 'Berean Standard Bible'], ['kjv', 'King James Version']]) {
      const article = element('article', 'bible-lab-detail');
      const text = element('div');
      article.append(element('h4', '', title), text);
      columns.append(article);
      readPassage(text, item.verse, edition);
    }
    output.replaceChildren(columns, prediction(item.prompt, item.choices, item.answer, (result) => {
      result.append(element('p', '', item.insight));
    }, 'Test your reading'));
  });
}

function gospelReader() {
  const lab = mount('Holy Week map and Gospel reader', 'Select a day and scene to read the Gospel accounts alongside one another. Watch for the details each writer emphasizes.');
  const books = ['Matthew', 'Mark', 'Luke', 'John'];
  steps(lab, holyWeek.map(({ title }) => title), 'Day', (output, index) => {
    const day = holyWeek[index];
    const map = element('div');
    const parallel = element('div', 'bible-lab-comparison bible-lab-gospels');
    const selector = select('Place and scene', day.scenes.map(({ place, event }) => place + ' · ' + event), showScene);
    output.replaceChildren(selector.wrapper, map, parallel, caption('Passages use the locally stored Berean Standard Bible (public domain).'));
    showScene(0);

    function showScene(sceneIndex) {
      const scene = day.scenes[sceneIndex];
      const markers = Object.entries(holyPlaces).map(([name, [x, y]]) => `<circle class="${name === scene.place ? 'bible-lab-marker' : 'bible-lab-dot'}" cx="${x}" cy="${y}" r="${name === scene.place ? 9 : 5}"/>
        <text x="${x}" y="${y + (name === 'Golgotha' ? -14 : 23)}" text-anchor="middle">${name}</text>`).join('');
      const visual = graphic(730, 300, `Schematic map near Jerusalem highlighting ${scene.place}`, `
        <path class="bible-lab-city" d="M170 63 L326 50 L336 105 L320 191 L269 245 L187 230 L163 157 Z"/>
        <path class="bible-lab-valley" d="M374 34 Q351 115 364 160 Q378 200 343 253"/>
        <path class="bible-lab-road" d="M327 117 Q440 94 520 93 Q592 136 610 246"/>
        <text x="242" y="166" text-anchor="middle">Jerusalem</text><text x="690" y="32" text-anchor="end">N ↑</text>${markers}`);
      illustration(map, visual, 'Schematic geography and a traditional teaching sequence. Precise sites and some day assignments are uncertain.',
        detail(scene.event, day.title + ' · ' + scene.place, [['Compare the witnesses', scene.note]]));
      parallel.replaceChildren(...books.map((book, gospel) => {
        const range = scene.verses[gospel];
        const card = element('article', 'bible-lab-detail');
        const text = element('div');
        card.append(element('h4', '', book), text);
        if (range) {
          const verses = [book, ...range];
          text.before(element('p', 'bible-lab-context', reference(verses)));
          readPassage(text, verses);
        } else {
          text.append(element('p', '', 'No direct parallel for this scene in this Gospel.'));
        }
        return card;
      }));
    }
  });
}

// Genesis divides itself with a repeated heading, “This is the account of …” (Hebrew toledot).
// Verse counts per chapter (BSB) place each section to scale on the chapter bar.
const GENESIS_CHAPTERS = [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26];
const GENESIS_KINDS = {
  prologue: ['#55763e', 'Prologue'],
  world: ['#447480', 'The whole world'],
  line: ['#a0602f', 'The chosen line'],
  branch: ['#8065a5', 'A side branch']
};
const GENESIS_SECTIONS = [
  ['Prologue: seven days', 'prologue', [1, 1], [2, 3], ['Genesis', 2, 1, 3], 'Creation in six days of work and a seventh day of rest.', 'The prologue has no “account of” heading. It sets the stage for everything the ten headings will follow.'],
  ['The heavens and the earth', 'world', [2, 4], [4, 26], ['Genesis', 2, 4, 4], 'The garden, the first disobedience, and Cain’s violence against Abel. Seth is born and people “call upon the name of the LORD” (4:26).', 'The account of the heavens and the earth is about what came out of them: humanity in the garden.'],
  ['Adam', 'world', [5, 1], [6, 8], ['Genesis', 5, 1, 1], 'Ten generations from Adam to Noah, a refrain of “and then he died,” and God’s grief over violence.', 'This heading alone says “book of the generations.” Listen for the refrain: almost every life ends “and then he died.” Enoch’s does not (5:24).'],
  ['Noah', 'world', [6, 9], [9, 29], ['Genesis', 6, 9, 9], 'The ark, the flood, and God’s covenant with every living creature.', 'The flood account sits inside Noah’s account. Compare the commission in 9:1 with 1:28.'],
  ['Noah’s sons', 'world', [10, 1], [11, 9], ['Genesis', 10, 1, 1], 'The Table of Nations (Genesis 10) and the tower of Babel (11:1–9).', 'Every nation is listed first; then Babel explains the scattering. The wide view comes before the narrow one.'],
  ['Shem', 'line', [11, 10], [11, 26], ['Genesis', 11, 10, 10], 'Ten generations from Shem to Terah, ending with Abram, Nahor, and Haran.', 'The camera narrows: out of all the nations in chapter 10, this list follows one line.'],
  ['Terah', 'line', [11, 27], [25, 11], ['Genesis', 11, 27, 27], 'Abram’s call, the promise, Isaac’s birth, and Abraham’s death.', 'The account is named for the father, but the story follows his son. Abraham’s whole story is “the account of Terah.”'],
  ['Ishmael', 'branch', [25, 12], [25, 18], ['Genesis', 25, 12, 12], 'Ishmael’s twelve sons and where they settled.', 'Seven verses. The brother not carried forward still gets his own heading, and his twelve princes fulfill the promise in 17:20.'],
  ['Isaac', 'line', [25, 19], [35, 29], ['Genesis', 25, 19, 19], 'Jacob and Esau, the stolen blessing, Jacob’s exile in Haran, and his return as Israel.', 'Short branch, then long main line: the same order as Noah’s sons (all nations) before Shem.'],
  ['Esau', 'branch', [36, 1], [37, 1], ['Genesis', 36, 1, 1], 'Esau’s family, the chiefs and kings of Edom.', 'The heading appears twice (36:1 and 36:9), so some readers count eleven headings, not ten.'],
  ['Jacob', 'line', [37, 2], [50, 26], ['Genesis', 37, 2, 2], 'Joseph sold into Egypt, Judah and Tamar, Joseph’s rise, and the family’s move to Egypt.', 'Named for Jacob, the story follows Joseph and his brothers. Genesis ends in Egypt, where Exodus begins.']
];

function genesisLab() {
  const lab = mount('Read Genesis by its own headings', 'Genesis divides itself with a repeated heading: “This is the account of …” (Hebrew toledot, “generations”). Step through the headings, read each one, and watch the story narrow from the whole world to one family.');
  const firstVerse = [0];
  for (const count of GENESIS_CHAPTERS) firstVerse.push(firstVerse.at(-1) + count);
  const total = firstVerse.at(-1);
  const x = ([chapter, verse]) => 20 + (firstVerse[chapter - 1] + verse - 1) / total * 700;
  const end = ([chapter, verse]) => x([chapter, verse + 1]);
  const legend = Object.values(GENESIS_KINDS).map(([color, label], i) =>
    `<rect x="${20 + i * 176}" y="160" width="14" height="14" rx="3" fill="${color}"/><text x="${40 + i * 176}" y="172">${label}</text>`).join('');
  const ticks = [1, 12, 25, 37, 50].map((chapter) => `<line x1="${x([chapter, 1])}" y1="126" x2="${x([chapter, 1])}" y2="132" class="bible-lab-cursor"/><text x="${x([chapter, 1])}" y="148" text-anchor="${chapter === 1 ? 'start' : 'middle'}">${chapter === 1 ? 'Chapter 1' : chapter}</text>`).join('');

  steps(lab, GENESIS_SECTIONS.map(([title], i) => i ? `${i} · ${title}` : title), 'Section', (output, index) => {
    const [title, kind, from, to, heading, contents, notice] = GENESIS_SECTIONS[index];
    const blocks = GENESIS_SECTIONS.map(([, k, a, b], i) => {
      const left = x(a);
      const width = Math.max(4, end(b) - left);
      const chosen = i === index;
      return `<rect x="${left + 0.75}" y="${chosen ? 70 : 78}" width="${width - 1.5}" height="${chosen ? 48 : 32}" rx="2" fill="${GENESIS_KINDS[k][0]}"${chosen ? ' stroke="#29251d" stroke-width="3"' : ' opacity=".72"'}><title>${i ? 'Account ' + i + ': ' + GENESIS_SECTIONS[i][0] : GENESIS_SECTIONS[i][0]}</title></rect>`;
    }).join('');
    const mid = (x(from) + end(to)) / 2;
    const anchor = mid < 120 ? 'start' : mid > 620 ? 'end' : 'middle';
    const drawing = `<text x="20" y="28">Genesis 1–11 · the whole world</text><text x="700" y="28" text-anchor="end">Genesis 12–50 · one family</text>
      <line x1="${x([12, 1])}" y1="36" x2="${x([12, 1])}" y2="124" class="bible-lab-cursor"/>
      ${blocks}<text x="${mid}" y="60" text-anchor="${anchor}">${index ? 'Account ' + index + ': ' + title : title}</text>
      ${ticks}${legend}`;
    const range = `Genesis ${from[0]}:${from[1]}–${to[0] === from[0] ? '' : to[0] + ':'}${to[1]}`;
    const card = detail(index ? `The account of ${title.toLowerCase().startsWith('the ') ? title.toLowerCase() : title}` : title, `${range} · ${GENESIS_KINDS[kind][1]}`, [['What follows', contents], ['Notice', notice]]);
    const quote = element('div', 'bible-lab-heading-verse');
    card.querySelector('h3').after(element('h4', '', (index ? 'The heading · ' : 'The close · ') + reference(heading) + ' · BSB'), quote);
    readPassage(quote, heading);
    illustration(output, graphic(740, 186, `Genesis 1 to 50 drawn to scale by verses, with ${range} highlighted`, drawing),
      'Each block is drawn to scale by number of verses. Side branches are short; the chosen line gets the long stories.', card);
    output.classList.remove('bible-lab-layout');
  });

  lab.append(formingAndFilling());
}

function formingAndFilling() {
  const section = element('div', 'bible-lab-forming');
  const realms = [
    ['Day 1', 'Light and darkness separated', 'Genesis 1:3–5'],
    ['Day 2', 'The expanse: sky above, waters below', 'Genesis 1:6–8'],
    ['Day 3', 'Dry land and plants', 'Genesis 1:9–13']
  ];
  const fillers = [
    ['Day 4', 'Sun, moon, and stars', 'Genesis 1:14–19', 0, 'They “rule the day and the night” and “separate the light from the darkness” (1:18), the very words of Day 1.'],
    ['Day 5', 'Sea creatures and birds', 'Genesis 1:20–23', 1, 'Fish fill the waters and birds fill the sky that Day 2 separated.'],
    ['Day 6', 'Land animals and humans', 'Genesis 1:24–31', 2, 'They live on Day 3’s dry land, and Day 3’s plants are given to them for food (1:29–30).']
  ];
  section.append(element('h3', '', 'Forming and filling: the pattern of Genesis 1'),
    element('p', '', 'Genesis 1:2 says the earth was “formless and void.” Days 1–3 give it form by separating realms; Days 4–6 fill those realms. Match each day of filling to the realm it fills.'));
  const grid = element('div', 'bible-lab-forming-grid');
  const choices = fillers.map(([day, what, ref], i) => {
    const realm = element('article', 'bible-lab-detail');
    realm.append(element('p', 'bible-lab-context', realms[i][0] + ' · forming · ' + realms[i][2]), element('h4', '', realms[i][1]));
    const filler = element('article', 'bible-lab-detail');
    const pick = select(`${day} fills the realm of…`, ['Choose a day', ...realms.map(([d, r]) => `${d} · ${r}`)], () => { result.replaceChildren(); filler.dataset.state = ''; });
    const why = element('p', 'bible-lab-forming-why');
    filler.append(element('p', 'bible-lab-context', day + ' · filling · ' + ref), element('h4', '', what), pick.wrapper, why);
    grid.append(realm, filler);
    return { pick, filler, why };
  });
  const result = element('div', 'bible-lab-result');
  result.setAttribute('aria-live', 'polite');
  const check = button('Check my matches', () => {
    let right = 0;
    choices.forEach(({ pick, filler, why }, i) => {
      const ok = Number(pick.input.value) - 1 === fillers[i][3];
      right += ok;
      filler.dataset.state = ok ? 'right' : 'wrong';
      why.textContent = (ok ? '✓ ' : '✗ It fills ' + realms[fillers[i][3]][0] + '. ') + fillers[i][4];
    });
    result.replaceChildren(element('p', '', `${right} of 3 matched. Day 7 has no realm and no “evening and morning”: God rests, blesses the day, and sets it apart (2:1–3).`),
      element('p', 'bible-lab-caption', 'Readers who take the days in sequence and readers who see a literary framework both notice this pattern. It shows how the chapter is built; on its own it does not settle how long the days were.'));
  });
  section.append(grid, check, result);
  return section;
}

const labs = {
  genesis: genesisLab,
  'the-tabernacle': tabernacle,
  'pauls-missionary-journeys': () => routeLab(false),
  'kingdoms-prophets-exile': kingdoms,
  'jesus-parables-lab': parableStudio,
  'feasts-of-israel': festivals,
  'acts-jerusalem-to-nations': () => routeLab(true),
  'how-the-bible-reached-us': manuscripts,
  'holy-week': gospelReader
};

if (main) labs[main.dataset.bibleLesson]?.();
