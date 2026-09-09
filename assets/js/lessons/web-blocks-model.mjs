/* ClassroomOS website blocks: shared definitions, readable generators and project format.
 * Blockly JSON serialization: https://docs.blockly.com/guides/configure/serialization/
 * No eval in the host page. Generated JavaScript runs only in the preview iframe.
 */
export const FORMAT = 'classroomos-web-blocks';
export const VERSION = 1;
const text = (name, label, value = '') => ({ name, label, value, kind: 'text' });
const choice = (name, label, values, value = values[0]) => ({ name, label, value, kind: 'choice', values });
const number = (name, label, value, min = -10000, max = 10000) => ({ name, label, value, kind: 'number', min, max });
export const definitions = {
  wb_element: { label: 'HTML element', group: 'HTML', color: '#245fa8', fields: [text('TAG', 'Tag', 'section'), text('ATTR', 'Attributes', 'class="card"')], inputs: { CHILDREN: ['Inside this element', 'HTML'] } },
  wb_text: { label: 'Text', group: 'HTML', color: '#245fa8', fields: [text('TEXT', 'Text', 'Write something worth sharing.')] },
  wb_void: { label: 'Image / input / line break', group: 'HTML', color: '#245fa8', fields: [choice('TAG', 'Tag', ['img', 'input', 'br', 'hr', 'source', 'wbr', 'meta', 'link']), text('ATTR', 'Attributes', 'src="" alt="Describe your image"')] },
  wb_comment: { label: 'HTML comment', group: 'HTML', color: '#245fa8', fields: [text('TEXT', 'Comment', 'Explain your design decision.')] },
  wb_rule: { label: 'CSS selector', group: 'CSS', color: '#7541a1', fields: [text('SELECTOR', 'Selector', '.card')], inputs: { PROPERTIES: ['Style declarations', 'Property'] } },
  wb_property: { label: 'CSS property', group: 'Property', color: '#7541a1', fields: [text('NAME', 'Property', 'background'), text('VALUE', 'Value', '#e6f2ff')] },
  wb_media: { label: 'Responsive CSS', group: 'CSS', color: '#7541a1', fields: [text('QUERY', 'Media condition', '(max-width: 600px)')], inputs: { RULES: ['Styles at this size', 'CSS'] } },
  wb_event: { label: 'When a visitor…', group: 'JS', color: '#936000', fields: [text('SELECTOR', 'Element selector', '#hello'), choice('EVENT', 'Event', ['click', 'input', 'change', 'keydown', 'submit'])], inputs: { ACTIONS: ['Do these actions', 'Action'] } },
  wb_set_text: { label: 'Change text', group: 'Action', color: '#247644', fields: [text('SELECTOR', 'Target selector', '#message'), text('TEXT', 'New text', 'Hello from my blocks!')] },
  wb_toggle: { label: 'Toggle a CSS class', group: 'Action', color: '#247644', fields: [text('SELECTOR', 'Target selector', 'body'), text('CLASS', 'Class name', 'compact')] },
  wb_style: { label: 'Change a style', group: 'Action', color: '#247644', fields: [text('SELECTOR', 'Target selector', '#message'), text('NAME', 'CSS property', 'color'), text('VALUE', 'Value', '#245fa8')] },
  wb_count: { label: 'Change a number', group: 'Action', color: '#247644', fields: [text('SELECTOR', 'Number element selector', '#score'), number('AMOUNT', 'Add this amount', 1)] },
  wb_filter: { label: 'Filter matching cards', group: 'JS', color: '#936000', fields: [text('INPUT', 'Search input selector', '#search'), text('CARDS', 'Cards selector', '.card'), text('COUNT', 'Results count selector', '#results')] },
  wb_motion: { label: 'Bouncing ball animation', group: 'JS', color: '#936000', fields: [text('SELECTOR', 'Canvas selector', '#stage'), number('SPEED', 'Pixels per second', 120, 0, 800), number('RADIUS', 'Ball radius', 18, 2, 80), text('COLOR', 'Ball color', '#245fa8')] },
  wb_html: { label: 'HTML source', group: 'HTML', color: '#245fa8', fields: [text('CODE', 'HTML source', '<p>My HTML</p>')] },
  wb_css: { label: 'CSS source', group: 'CSS', color: '#7541a1', fields: [text('CODE', 'CSS source', 'body { font-family: system-ui; }')] },
  wb_js: { label: 'JavaScript source', group: 'JS', color: '#936000', fields: [text('CODE', 'JavaScript source', '// Write JavaScript here.')] },
};
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const q = value => JSON.stringify(String(value)).replace(/</g, '\\u003c');
export function chain(items) {
  const copies = structuredClone(items);
  for (let i = copies.length - 2; i >= 0; i--) copies[i].next = { block: copies[i + 1] };
  return copies[0];
}
export function block(type, fields = {}, children = {}) {
  return { type, fields, ...(Object.keys(children).length ? { inputs: Object.fromEntries(Object.entries(children).filter(([, list]) => list.length).map(([name, list]) => [name, { block: chain(list) }])) } : {}) };
}
export function workspaceState(items) {
  return { blocks: { languageVersion: 0, blocks: items.map((item, i) => ({ ...structuredClone(item), x: 24 + (i % 3) * 380, y: 24 + Math.floor(i / 3) * 180 })) } };
}
const defaults = (b) => Object.fromEntries((definitions[b.type]?.fields || []).map(f => [f.name, b.fields?.[f.name] ?? f.value]));
function list(first, depth = 0) {
  let out = '';
  for (let b = first; b; b = b.next?.block) {
    if (b.enabled !== false && !b.disabledReasons?.length) out += generateBlock(b, depth);
  }
  return out;
}
function generateBlock(b, depth) {
  const f = defaults(b), pad = '  '.repeat(depth), inside = (name, d = depth + 1) => list(b.inputs?.[name]?.block, d);
  switch (b.type) {
    case 'wb_text': return `${pad}${escapeHTML(f.TEXT)}\n`;
    case 'wb_element': {
      const tag = /^[a-z][a-z0-9-]*$/i.test(f.TAG) ? f.TAG.toLowerCase() : 'div';
      return `${pad}<${tag}${f.ATTR.trim() ? ' ' + f.ATTR.trim() : ''}>\n${inside('CHILDREN')}${pad}</${tag}>\n`;
    }
    case 'wb_void': return `${pad}<${f.TAG}${f.ATTR.trim() ? ' ' + f.ATTR.trim() : ''}>\n`;
    case 'wb_comment': return `${pad}<!-- ${f.TEXT.replace(/--/g, '—')} -->\n`;
    case 'wb_rule': return `${pad}${f.SELECTOR} {\n${inside('PROPERTIES')}${pad}}\n`;
    case 'wb_property': return `${pad}${f.NAME}: ${f.VALUE};\n`;
    case 'wb_media': return `${pad}@media ${f.QUERY} {\n${inside('RULES')}${pad}}\n`;
    case 'wb_html': case 'wb_css': case 'wb_js': return `${f.CODE}\n`;
    case 'wb_event': return `${pad}document.querySelectorAll(${q(f.SELECTOR)}).forEach(element => {\n${pad}  element.addEventListener(${q(f.EVENT)}, event => {\n${pad}    event.preventDefault();\n${inside('ACTIONS', depth + 2)}${pad}  });\n${pad}});\n`;
    case 'wb_set_text': return `${pad}document.querySelectorAll(${q(f.SELECTOR)}).forEach(element => { element.textContent = ${q(f.TEXT)}; });\n`;
    case 'wb_toggle': return `${pad}document.querySelectorAll(${q(f.SELECTOR)}).forEach(element => { element.classList.toggle(${q(f.CLASS)}); });\n`;
    case 'wb_style': return `${pad}document.querySelectorAll(${q(f.SELECTOR)}).forEach(element => { element.style.setProperty(${q(f.NAME)}, ${q(f.VALUE)}); });\n`;
    case 'wb_count': return `${pad}document.querySelectorAll(${q(f.SELECTOR)}).forEach(element => { element.textContent = String((Number(element.textContent) || 0) + ${Number(f.AMOUNT)}); });\n`;
    case 'wb_filter': return `// Filter the cards whenever the visitor types.\n{\n  const input = document.querySelector(${q(f.INPUT)});\n  const cards = [...document.querySelectorAll(${q(f.CARDS)})];\n  const count = document.querySelector(${q(f.COUNT)});\n  if (input) {\n    const filter = () => {\n      const term = input.value.trim().toLowerCase();\n      let visible = 0;\n      cards.forEach(card => {\n        card.hidden = !card.textContent.toLowerCase().includes(term);\n        if (!card.hidden) visible++;\n      });\n      if (count) count.textContent = visible + ' of ' + cards.length + ' shown' + (visible ? '' : ' — try another search.');\n    };\n    input.addEventListener('input', filter);\n    filter();\n  }\n}\n`;
    case 'wb_motion': return `// Time-based animation; pauses when this page is hidden.\n{\n  const canvas = document.querySelector(${q(f.SELECTOR)});\n  const context = canvas?.getContext('2d');\n  if (context) {\n    const radius = ${Number(f.RADIUS)};\n    const speed = ${Number(f.SPEED)};\n    let x = radius, direction = 1, last = 0, frame = 0;\n    const reduced = matchMedia('(prefers-reduced-motion: reduce)');\n    const draw = () => {\n      context.clearRect(0, 0, canvas.width, canvas.height);\n      context.fillStyle = ${q(f.COLOR)};\n      context.beginPath();\n      context.arc(x, canvas.height / 2, radius, 0, Math.PI * 2);\n      context.fill();\n    };\n    const tick = now => {\n      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;\n      last = now;\n      x += direction * speed * dt;\n      if (x >= canvas.width - radius) { x = canvas.width - radius; direction = -1; }\n      if (x <= radius) { x = radius; direction = 1; }\n      draw();\n      frame = requestAnimationFrame(tick);\n    };\n    const resume = () => {\n      cancelAnimationFrame(frame); last = 0; draw();\n      if (!document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);\n    };\n    document.addEventListener('visibilitychange', resume);\n    reduced.addEventListener('change', resume);\n    resume();\n  }\n}\n`;
    default: throw new Error(`Unknown block: ${b.type}`);
  }
}
export function generate(state, title = 'My website') {
  const parts = { html: '', css: '', js: '', warnings: [] };
  for (const top of state.blocks?.blocks || []) {
    for (let b = top; b; b = b.next?.block) {
      if (b.enabled === false || b.disabledReasons?.length) continue;
      const group = definitions[b.type]?.group;
      const target = { HTML: 'html', CSS: 'css', JS: 'js' }[group];
      if (target) parts[target] += generateBlock(b, 0);
      else parts.warnings.push(`${definitions[b.type]?.label || b.type}: connect this block inside its matching parent to use it.`);
    }
  }
  parts.document = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escapeHTML(title)}</title>\n<style>\n${parts.css.replace(/<\/style/gi, '<\\/style')}</style>\n</head>\n<body>\n${parts.html}<script>\n${parts.js.replace(/<\/script/gi, '<\\/script')}</script>\n</body>\n</html>\n`;
  return parts;
}
// Imported files are data, with a bounded vocabulary and size; never executable host code.
export function validateProject(value) {
  if (!value || value.format !== FORMAT || value.version !== VERSION || typeof value.title !== 'string' || value.title.length > 200) throw new Error('Choose a ClassroomOS website blocks JSON file (version 1).');
  const state = value.workspace;
  if (!state || typeof state !== 'object' || Array.isArray(state) || (state.blocks !== undefined && (!state.blocks || !Array.isArray(state.blocks.blocks)))) throw new Error('The project has no valid block workspace.');
  // Blockly omits the blocks serializer entirely when the workspace is empty.
  const blocks = state.blocks || { languageVersion: 0, blocks: [] };
  let count = 0;
  function visit(b, depth = 0) {
    if (++count > 600 || depth > 100 || !b || !definitions[b.type]) throw new Error('The project contains unsupported blocks or is too large (600 blocks maximum).');
    const def = definitions[b.type];
    for (const [name, val] of Object.entries(b.fields || {})) {
      const field = def.fields.find(f => f.name === name);
      if (!field || !['string', 'number'].includes(typeof val) || String(val).length > 100000) throw new Error('A block field is invalid.');
      if (field.kind === 'choice' && !field.values.includes(val)) throw new Error('A block choice is invalid.');
      if (field.kind === 'number' && (!Number.isFinite(Number(val)) || Number(val) < field.min || Number(val) > field.max)) throw new Error('A block number is out of range.');
    }
    for (const [name, input] of Object.entries(b.inputs || {})) {
      if (!def.inputs?.[name] || !input.block) throw new Error('A block connection is invalid.');
      if (definitions[input.block.type]?.group !== def.inputs[name][1]) throw new Error('A block is connected to the wrong kind of parent.');
      visit(input.block, depth + 1);
    }
    if (b.next) {
      if (definitions[b.next.block?.type]?.group !== def.group) throw new Error('A block stack mixes incompatible categories.');
      visit(b.next.block, depth + 1);
    }
  }
  blocks.blocks.forEach(b => visit(b));
  // Only blocks are admitted, not plugin state or other Blockly serializers.
  return { format: FORMAT, version: VERSION, title: value.title, workspace: { blocks } };
}

export function htmlBlocks(source) {
  const template = document.createElement('template');
  template.innerHTML = source;
  const voids = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  function convert(node) {
    if (node.nodeType === 3) return node.textContent.trim() ? block('wb_text', { TEXT: node.textContent }) : null;
    if (node.nodeType === 8) return block('wb_comment', { TEXT: node.textContent });
    if (node.nodeType !== 1) return null;
    if (['svg', 'math', 'script', 'style', 'template', 'pre'].includes(node.localName) || (voids.has(node.localName) && !definitions.wb_void.fields[0].values.includes(node.localName))) return block('wb_html', { CODE: node.outerHTML });
    const attrs = [...node.attributes].map(a => `${a.name}="${escapeHTML(a.value)}"`).join(' ');
    return block(voids.has(node.localName) ? 'wb_void' : 'wb_element', { TAG: node.localName, ATTR: attrs }, voids.has(node.localName) ? {} : { CHILDREN: [...node.childNodes].map(convert).filter(Boolean) });
  }
  return [...template.content.childNodes].map(convert).filter(Boolean);
}
export function cssBlocks(source) {
  // CSSOM parses declaration values correctly (including semicolons inside strings).
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(source);
  function declarations(css) {
    // Iterating CSSStyleDeclaration expands border/font shorthands into dozens
    // of properties. Split the normalized cssText, retaining those shorthands.
    const pieces = []; let start = 0, quote = '', depth = 0;
    for (let i = 0; i < css.length; i++) {
      const c = css[i];
      if (c === '\\') { i++; continue; }
      if (quote) { if (c === quote) quote = ''; continue; }
      if (c === '"' || c === "'") quote = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ';' && depth === 0) { pieces.push(css.slice(start, i)); start = i + 1; }
    }
    if (css.slice(start).trim()) pieces.push(css.slice(start));
    return pieces.map(piece => { const colon = piece.indexOf(':'); return block('wb_property', { NAME: piece.slice(0, colon).trim(), VALUE: piece.slice(colon + 1).trim() }); });
  }
  function rule(r) {
    if (r.type === CSSRule.STYLE_RULE && !r.cssRules?.length) return block('wb_rule', { SELECTOR: r.selectorText }, { PROPERTIES: declarations(r.style.cssText) });
    if (r.type === CSSRule.MEDIA_RULE) return block('wb_media', { QUERY: r.conditionText }, { RULES: [...r.cssRules].map(rule) });
    return block('wb_css', { CODE: r.cssText });
  }
  return [...sheet.cssRules].map(rule);
}
