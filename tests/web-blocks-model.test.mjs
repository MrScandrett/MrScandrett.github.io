import test from 'node:test';
import assert from 'node:assert/strict';
import { block, chain, workspaceState, generate, validateProject, FORMAT, VERSION } from '../assets/js/lessons/web-blocks-model.mjs';
const project = blocks => ({ format: FORMAT, version: VERSION, title: 'My <website>', workspace: workspaceState(blocks) });

test('nested HTML, CSS and event blocks generate a complete, escaped website', () => {
  const data = project([
    block('wb_element', { TAG: 'main', ATTR: 'id="main"' }, { CHILDREN: [block('wb_element', { TAG: 'h1', ATTR: '' }, { CHILDREN: [block('wb_text', { TEXT: '<not markup> & a title' })] }), block('wb_void', { TAG: 'input', ATTR: 'id="name"' })] }),
    block('wb_media', { QUERY: '(max-width: 600px)' }, { RULES: [block('wb_rule', { SELECTOR: 'main' }, { PROPERTIES: [block('wb_property', { NAME: 'padding', VALUE: '8px' })] })] }),
    block('wb_event', { SELECTOR: '#hello', EVENT: 'click' }, { ACTIONS: [block('wb_set_text', { SELECTOR: 'h1', TEXT: '</script><h1>My text</h1>' })] }),
  ]);
  const result = generate(validateProject(data).workspace, data.title);
  assert.match(result.html, /<main id="main">\s+<h1>\s+&lt;not markup&gt; &amp; a title/);
  assert.match(result.css, /@media \(max-width: 600px\) \{\s+main \{\s+padding: 8px;/);
  assert.match(result.js, /\\u003c\/script>/);
  assert.match(result.document, /<title>My &lt;website&gt;<\/title>/);
  assert.equal((result.document.match(/<script>/g) || []).length, 1);
  assert.deepEqual(result.warnings, []);
});

test('only attached actions/properties execute; disabled blocks are skipped', () => {
  const disabled = block('wb_text', { TEXT: 'disabled' }); disabled.disabledReasons = ['MANUALLY_DISABLED'];
  const state = workspaceState([block('wb_property'), block('wb_count'), block('wb_element', { TAG: 'main', ATTR: '' }, { CHILDREN: [disabled, block('wb_text', { TEXT: 'kept' })] })]);
  const result = generate(state);
  assert.equal(result.warnings.length, 2);
  assert.doesNotMatch(result.html, /disabled/); assert.match(result.html, /kept/);
  assert.equal(result.js, '');
});

test('project import rejects incompatible, oversized and unknown blocks', () => {
  assert.throws(() => validateProject({ ...project([]), version: 2 }), /version 1/);
  assert.throws(() => validateProject(project([block('unknown')])) , /unsupported/);
  assert.throws(() => validateProject(project([block('wb_rule', {}, { PROPERTIES: [block('wb_text')] })])), /wrong kind/);
  assert.throws(() => validateProject(project([block('wb_motion', { SPEED: -1 })])), /out of range/);
  assert.throws(() => validateProject(project([chain(Array.from({length: 102}, () => block('wb_text')))])), /too large/);
  assert.throws(() => validateProject(project([block('wb_text', { OTHER: 'not a field' })])), /field is invalid/);
});

test('HTML download preserves source code while keeping closing tags inside strings', () => {
  const { document } = generate(workspaceState([block('wb_js', { CODE: 'const text = "</script>";' })]));
  assert.match(document, /const text = "<\\\/script>";/);
  assert.equal((document.match(/<\/script>/g) || []).length, 1);
});

test('an empty Blockly workspace can be saved and reopened', () => {
  const restored = validateProject({ ...project([]), workspace: {} });
  assert.deepEqual(restored.workspace.blocks.blocks, []);
  assert.equal(generate(restored.workspace).html, '');
});
