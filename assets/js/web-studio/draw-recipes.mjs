import { COLUMNS, MAX_ITEMS, children, createItem, emptyDrawing, nextRow } from './draw-model.mjs';

export const THEMES = {
  canvas: { label: 'Canvas', background: '#f6f4ef', color: '#1d2733', font: 'system' },
  editorial: { label: 'Editorial', background: '#fbf4e8', color: '#39271b', font: 'serif' },
  midnight: { label: 'Midnight', background: '#171c32', color: '#f3f0ff', font: 'system' },
  garden: { label: 'Garden', background: '#e9f2e6', color: '#18372a', font: 'rounded' },
};

export const SECTIONS = {
  hero: { label: 'Hero', description: 'Title and introduction', size: 3 },
  cards: { label: 'Feature cards', description: 'Two side-by-side cards', size: 7 },
  reveal: { label: 'Show / hide', description: 'Button and answer', size: 4 },
  message: { label: 'Change text', description: 'Button and message', size: 4 },
  counter: { label: 'Count clicks', description: 'Button and counter', size: 4 },
  contact: { label: 'Contact', description: 'Heading and email link', size: 3 },
};

export const TEMPLATES = {
  portfolio: {
    label: 'Portfolio', description: 'Intro, project cards and contact',
    theme: 'editorial', sections: ['cards', 'contact'],
    headline: 'My work, in progress', intro: 'Introduce yourself and share what you’ve been making.',
  },
  demo: {
    label: 'Interactive demo', description: 'Intro and a working click counter',
    theme: 'midnight', sections: ['counter'],
    headline: 'What happens when you click?', intro: 'Try the counter below, then make it your own.',
  },
};

const INTERACTIONS = {
  reveal: { title: 'Frequently asked question', button: 'Show or hide the answer', output: 'Write your answer here.', type: 'toggle', text: '' },
  message: { title: 'Switch the message', button: 'Change the message', output: 'Waiting for a click…', type: 'text', text: 'You changed the message!' },
  counter: { title: 'Click counter', button: 'Add a click', output: 'Clicks: 0', type: 'count', text: 'Clicks: ' },
};

export function createTemplate(kind) {
  const { theme, sections, headline, intro } = TEMPLATES[kind];
  const drawing = emptyDrawing();
  const { background, color, font } = THEMES[theme];
  Object.assign(drawing.page, { background, color, font });
  const hero = insertSection(drawing, 'hero');
  const [title, copy] = children(drawing, hero.id);
  title.text = headline;
  copy.text = intro;
  for (const section of sections) insertSection(drawing, section);
  return drawing;
}

export const ITEM_STYLES = {
  box: {
    Card: { background: '#ffffff', color: '#222045', padding: 20, radius: 20, borderWidth: 0, shadow: true },
    Tinted: { background: '#edf0ff', color: '#222045', padding: 20, radius: 16, borderWidth: 0, shadow: false },
    Outline: { background: '', color: '', padding: 20, radius: 12, borderWidth: 2, borderColor: '#766bbb', shadow: false },
  },
  button: {
    Solid: { background: '#302665', color: '#ffffff', padding: 12, radius: 10, borderWidth: 0, shadow: false },
    Pill: { background: '#205943', color: '#ffffff', padding: 12, radius: 200, borderWidth: 0, shadow: false },
    Outline: { background: '#ffffff', color: '#302665', padding: 12, radius: 10, borderWidth: 2, borderColor: '#302665', shadow: false },
  },
};

export function insertSection(drawing, kind) {
  const recipe = SECTIONS[kind];
  if (drawing.items.length + recipe.size > MAX_ITEMS) throw new Error(`This section would exceed the ${MAX_ITEMS}-item limit.`);
  const row = nextRow(drawing, null);
  if (row > 400) throw new Error('There is no room to add a section below the page.');
  const add = (type, tag, parent, placement, style, text) => {
    const item = createItem(drawing, type, { parent, ...placement }, tag);
    Object.assign(item.style, style);
    if (text !== undefined) item.text = text;
    return item;
  };
  const firstMain = !drawing.items.some((item) => item.tag === 'main');
  const panel = add('box', kind === 'contact' ? 'footer' : firstMain ? 'main' : 'section', null, { row, colSpan: COLUMNS, rowSpan: kind === 'hero' ? 5 : 4 }, {
    background: kind === 'hero' ? '#262052' : kind === 'cards' || kind === 'contact' ? '#edf0ff' : '#e3f3eb',
    color: kind === 'hero' ? '#ffffff' : '#222045',
    radius: 24,
    padding: 24,
  });
  const hasTitle = drawing.items.some((item) => item.tag === 'h1');
  const heading = hasTitle ? 'h2' : 'h1';
  const wide = { col: 1, colSpan: COLUMNS };
  if (kind === 'hero') {
    add('text', heading, panel.id, { ...wide, row: 1, rowSpan: 2 }, { size: 48, align: 'center', valign: 'end' }, 'Make something worth sharing');
    add('text', 'p', panel.id, { ...wide, row: 3 }, { size: 20, align: 'center' }, 'Introduce your project and give visitors a reason to explore.');
  } else if (kind === 'cards') {
    for (const [index, title, copy] of [
      [0, 'What I made', 'Describe your idea in a sentence or two.'],
      [1, 'How it works', 'Share the details you want people to remember.'],
    ]) {
      const card = add('box', 'article', panel.id, { col: 1 + index * 6, row: 1, colSpan: 6, rowSpan: 3 }, { padding: 18, radius: 18, background: '#ffffff', shadow: true });
      add('text', index === 0 ? heading : 'h2', card.id, { ...wide, row: 1, rowSpan: 1 }, { size: 25 }, title);
      add('text', 'p', card.id, { ...wide, row: 2 }, { size: 17 }, copy);
    }
  } else if (kind === 'contact') {
    add('text', heading, panel.id, { ...wide, row: 1 }, { size: 30 }, 'Get in touch');
    const link = add('link', 'a', panel.id, { ...wide, row: 2 }, { weight: '700' }, 'Email me');
    link.href = 'mailto:hello@example.com';
  } else {
    const { title, button: caption, output, type, text } = INTERACTIONS[kind];
    add('text', heading, panel.id, { ...wide, row: 1 }, { size: 30 }, title);
    const button = add('button', 'button', panel.id, { ...wide, row: 2 }, { background: '#205943', radius: 12 }, caption);
    const target = add('text', 'p', panel.id, { ...wide, row: 3 }, { background: '#ffffff', padding: 14, radius: 12 }, output);
    button.action = { type, target: target.id, text };
  }
  return panel;
}
