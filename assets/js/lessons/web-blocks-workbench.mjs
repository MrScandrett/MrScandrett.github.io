import { definitions, FORMAT, VERSION, generate, validateProject, workspaceState, block, chain, htmlBlocks, cssBlocks } from './web-blocks-model.mjs';
import { profiles, starters, makeStarter } from './web-blocks-starters.mjs';

let library;
function loadBlockly() {
  if (window.Blockly) return Promise.resolve(window.Blockly);
  if (!library) library = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../../vendor/blockly.min.js', import.meta.url).href;
    script.onload = () => window.Blockly ? resolve(window.Blockly) : reject(new Error('Blockly is unavailable.'));
    script.onerror = () => { library = null; script.remove(); reject(new Error('Check your connection and reload the lesson.')); };
    document.head.append(script);
  });
  return library;
}
function register(B) {
  for (const [type, def] of Object.entries(definitions)) {
    if (B.Blocks[type]) continue;
    B.Blocks[type] = { init() {
      this.setColour(def.color);
      this.appendDummyInput().appendField(def.label);
      for (const f of def.fields) {
        const input = this.appendDummyInput();
        let field;
        if (f.kind === 'choice') field = new B.FieldDropdown(f.values.map(value => [value, value]));
        else if (f.kind === 'number') field = new B.FieldNumber(f.value, f.min, f.max);
        else field = new B.FieldTextInput(f.value);
        field.maxDisplayLength = f.name === 'ATTR' || f.name === 'CODE' ? 22 : 30;
        input.appendField(f.label).appendField(field, f.name);
      }
      for (const [name, [, check]] of Object.entries(def.inputs || {})) this.appendStatementInput(name).setCheck(check).appendField({ HTML: 'Content', Property: 'Styles', CSS: 'Rules', Action: 'Do' }[check]);
      this.setPreviousStatement(true, def.group); this.setNextStatement(true, def.group);
      this.setTooltip(`${def.label}. Edit its full parameters in the block fields panel. ${def.group === 'Action' ? 'Connect inside an event.' : def.group === 'Property' ? 'Connect inside a CSS selector.' : ''}`);
    } };
  }
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}
export async function mount(section) {
  const B = await loadBlockly(); register(B);
  const slug = section.dataset.webBlocks;
  const storageKey = `classroomos-web-blocks-v1:${slug}`;
  const lastKey = 'classroomos-web-blocks-last-v1';
  const defaultStarter = profiles[slug] || 'first';
  section.insertAdjacentHTML('beforeend', `
<div data-wb-app class="wb-app">
  <div class="wb-toolbar">
    <label>Website title <input data-wb-title maxlength="200" value="My website"></label>
    <label>Starting project <select data-wb-starter></select></label>
    <button type="button" data-wb-load>Load starting project</button>
    <button type="button" data-wb-continue>Continue last website</button>
  </div>
  <p data-wb-task class="wb-task"></p>
  <div class="wb-confirm" data-wb-confirm hidden><p data-wb-confirm-text></p><button type="button" data-wb-confirm-yes>Replace this workspace</button> <button type="button" data-wb-confirm-no>Keep my work</button></div>
  <div class="wb-toolbar wb-file-tools">
    <button type="button" data-wb-save>Save blocks file</button>
    <label class="wb-file-label">Open blocks file <input data-wb-file type="file" accept=".json,application/json"></label>
    <button type="button" data-wb-download>Download index.html</button>
    <button type="button" data-wb-undo>Undo block edit</button>
    <button type="button" data-wb-redo>Redo</button>
    <button type="button" data-wb-restore disabled>Restore previous project</button>
  </div>
  <p class="wb-status" data-wb-storage role="status"></p>
  <div class="wb-workgrid">
    <div class="wb-build-pane">
      <div class="wb-pane-bar"><h3>Build with blocks</h3><button type="button" data-wb-fit>Fit blocks</button></div>
      <div class="wb-toolbar wb-jump"><button type="button" data-wb-jump="HTML">Show HTML</button><button type="button" data-wb-jump="CSS">Show CSS</button><button type="button" data-wb-jump="JS">Show behavior</button></div>
      <div class="wb-canvas" data-wb-canvas aria-label="Website Blockly workspace"></div>
      <details class="wb-inspector" open>
        <summary>Block fields and keyboard builder</summary>
        <p>Choose a block to edit its full text. You can build here with a keyboard or touch, without dragging.</p>
        <label>Selected block <select data-wb-select></select></label>
        <div data-wb-fields></div>
        <div class="wb-add-grid">
          <label>New block <select data-wb-type></select></label>
          <label>Place it <select data-wb-place></select></label>
        </div>
        <div class="wb-toolbar"><button type="button" data-wb-add>Add block</button><button type="button" data-wb-remove>Remove selected block</button><button type="button" data-wb-up>Move earlier</button><button type="button" data-wb-down>Move later</button></div>
        <p data-wb-edit-status role="status"></p>
        <button type="button" class="wb-mobile-jump" data-wb-preview-jump>See my live website</button>
      </details>
    </div>
    <div class="wb-preview-pane">
      <div class="wb-pane-bar"><h3>Live website</h3><label>Preview width <select data-wb-width><option value="wide">Available width</option><option value="phone">Phone · 375 px</option></select></label></div>
      <div class="wb-toolbar"><label><input data-wb-live type="checkbox" checked> Live updates</label><button type="button" data-wb-run>Restart preview</button><button type="button" data-wb-stop>Stop preview</button></div>
      <div class="wb-preview-shell"><iframe data-wb-preview title="Live website built from your blocks" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe></div>
      <p data-wb-render-status role="status"></p>
      <button type="button" class="wb-mobile-jump" data-wb-builder-jump>Back to block fields</button>
      <details class="wb-console"><summary>Preview messages</summary><pre data-wb-console aria-label="Preview messages"></pre></details>
      <details class="wb-code"><summary>See the HTML, CSS and JavaScript</summary>
        <p>Blocks generate real code. Download the complete HTML file to open in a browser or edit in VS Code. Text edits made outside this workshop do not turn back into blocks; keep the blocks file too.</p>
        <label>Show file <select data-wb-code-tab><option value="html">HTML body</option><option value="css">CSS styles</option><option value="js">JavaScript</option><option value="document">Complete index.html</option></select></label>
        <button type="button" data-wb-copy>Copy shown code</button><pre tabindex="0"><code data-wb-code></code></pre>
      </details>
    </div>
  </div>
  <details class="wb-help"><summary>How to build, save, and return</summary>
    <ol><li>Choose a starting project, or use <strong>Try with blocks</strong> beside a lesson example.</li><li>Blue blocks build HTML. Purple blocks style it. Gold events run green actions. Drag blocks together, or use the keyboard builder. Stack order controls page order; CSS properties go inside a selector, and actions inside an event.</li><li>Click a block to edit its fields. Attributes use HTML syntax, such as <code>id="hello" class="card"</code>. CSS uses selector names, such as <code>#hello</code> or <code>.card</code>. A name must match in both places.</li><li>Change one thing and predict the result. Every edit restarts the preview, including counters. Uncheck Live updates to keep the preview running while you work.</li><li>Your work is saved in this browser for this lesson. <strong>Save blocks file</strong> makes a portable backup. Use <strong>Open blocks file</strong> on any lesson or computer to keep editing. <strong>Continue last website</strong> brings your latest saved work from another lesson.</li><li><strong>Download index.html</strong> gives you a standalone website with its CSS and JavaScript included. No account is needed. Keep it with any images or linked pages you add.</li></ol>
    <p>Preview isolation prevents forms, new windows, external scripts, and access to this lesson’s storage. Inline JavaScript works. Online images need a connection; linked local files need your own project folder. Use the original WebXR lab for headset features. A practice shop does not take payments.</p>
    <p>Lesson fragments may depend on code introduced in earlier steps. They load as editable source blocks when a faithful smaller-block conversion is not available. Preview messages report JavaScript errors; they are not a full HTML or accessibility validator.</p>
  </details>
</div>`);
  const $ = selector => section.querySelector(`[data-wb-${selector}]`);
  const starterSelect = $('starter');
  for (const [id, starter] of Object.entries(starters)) starterSelect.add(new Option(starter.name, id));
  starterSelect.value = defaultStarter;
  const groups = { HTML: 'HTML structure', CSS: 'CSS styles', Property: 'CSS properties', JS: 'Events and behavior', Action: 'Event actions' };
  const toolboxNames = { HTML: 'HTML', CSS: 'CSS', Property: 'Properties', JS: 'Events', Action: 'Actions' };
  const toolbox = { kind: 'categoryToolbox', contents: Object.entries(groups).map(([group]) => ({ kind: 'category', name: toolboxNames[group], colour: Object.values(definitions).find(d => d.group === group).color, contents: Object.entries(definitions).filter(([, d]) => d.group === group).map(([type]) => ({ kind: 'block', type })) })) };
  const ws = B.inject($('canvas'), { toolbox, horizontalLayout: true, renderer: 'zelos', sounds: false, trashcan: true, maxBlocks: 600, zoom: { controls: true, wheel: false, startScale: 0.7, minScale: 0.25, maxScale: 1.5 }, move: { scrollbars: true, drag: true, wheel: false }, media: new URL('../../vendor/blockly-media/', import.meta.url).href });
  // Blockly 13.2.1 repeats each category ID on its visual inner div. Keep the
  // ID on the ARIA treeitem (the keyboard target), not its decorative child.
  $('canvas').querySelectorAll('.blocklyToolboxCategory[id]').forEach(row => {
    if (row.parentElement?.id === row.id) row.removeAttribute('id');
  });
  let loading = false, selectedId = '', previous = null, timer, parts, previewToken = '', pending;
  let protectedSave = false;
  function current() { return { format: FORMAT, version: VERSION, title: $('title').value, workspace: B.serialization.workspaces.save(ws) }; }
  function status(message) { $('edit-status').textContent = message; }
  function save() {
    if (protectedSave) return;
    try {
      const value = JSON.stringify(current());
      localStorage.setItem(storageKey, value); localStorage.setItem(lastKey, value);
      $('storage').textContent = 'Saved in this browser for this lesson. Download a blocks file to keep a portable copy.';
    } catch {
      $('storage').textContent = 'Browser saving is unavailable or full. Save a blocks file before leaving.';
    }
  }
  function selected() { return ws.getBlockById(selectedId); }
  function outline() {
    const items = [];
    function visit(b, depth) {
      if (!b) return;
      const def = definitions[b.type];
      items.push({ b, depth, label: `${'· '.repeat(Math.min(depth, 8))}${def.label}: ${String(b.getFieldValue(def.fields[0]?.name) || '').slice(0, 45)}` });
      for (const name of Object.keys(def.inputs || {})) visit(b.getInputTargetBlock(name), depth + 1);
      visit(b.getNextBlock(), depth);
    }
    ws.getTopBlocks(true).forEach(b => visit(b, 0));
    return items;
  }
  function refreshOutline() {
    const select = $('select'); select.replaceChildren(new Option('Choose a block', ''));
    outline().forEach(item => select.add(new Option(item.label, item.b.id)));
    if (!selected()) selectedId = '';
    select.value = selectedId;
  }
  function places() {
    const select = $('place'); const old = select.value;
    select.replaceChildren(new Option('As a separate stack', 'top'));
    const b = selected();
    if (b) {
      select.add(new Option('After selected block', 'after'));
      for (const [name, [label]] of Object.entries(definitions[b.type].inputs || {})) select.add(new Option(label, name));
    }
    if ([...select.options].some(o => o.value === old)) select.value = old;
    else if (b) select.value = Object.keys(definitions[b.type].inputs || {})[0] || 'after';
  }
  function inspect() {
    const b = selected(); $('fields').replaceChildren(); places();
    for (const name of ['remove', 'up', 'down']) $(name).disabled = !b;
    if (!b) return;
    for (const field of definitions[b.type].fields) {
      const control = field.kind === 'choice' ? el('select') : el(field.kind === 'number' ? 'input' : 'textarea');
      if (field.kind === 'choice') field.values.forEach(value => control.add(new Option(value, value)));
      if (field.kind === 'number') Object.assign(control, { type: 'number', min: field.min, max: field.max, step: 'any' });
      else if (control.tagName === 'TEXTAREA') { control.rows = field.name === 'CODE' ? 7 : field.name === 'ATTR' ? 3 : 2; control.spellcheck = false; }
      control.value = b.getFieldValue(field.name);
      control.dataset.field = field.name;
      control.addEventListener('input', () => {
        if (field.kind === 'number' && !control.validity.valid) return;
        b.setFieldValue(control.value, field.name);
      });
      $('fields').append(el('label', { textContent: field.label }, [control]));
    }
  }
  function selectBlock(id) {
    selectedId = id; const b = selected();
    if (b) { b.select(); ws.centerOnBlock(id, true); }
    refreshOutline(); inspect();
  }
  for (const [type, def] of Object.entries(definitions)) $('type').add(new Option(`${groups[def.group]} — ${def.label}`, type));
  $('select').addEventListener('change', () => selectBlock($('select').value));
  function codeView() { if (parts) $('code').textContent = parts[$('code-tab').value]; }
  function preview() {
    if (!parts) return;
    previewToken = crypto.randomUUID();
    $('console').textContent = '';
    const bridge = `<script>(()=>{const send=(kind,text)=>parent.postMessage({webBlocks:${JSON.stringify(previewToken)},kind,text:String(text).slice(0,2000)},'*');addEventListener('error',e=>send('error',e.message));addEventListener('unhandledrejection',e=>send('error',e.reason?.message||e.reason));addEventListener('securitypolicyviolation',e=>send('note','Preview blocked '+e.violatedDirective+'. External scripts and local file dependencies need your own project folder.'));const original=console.log;console.log=(...args)=>{original.apply(console,args);send('log',args.map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' '));};addEventListener('DOMContentLoaded',()=>send('ready','Preview ready'));})();</script>`;
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: data:; font-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">`;
    $('preview').srcdoc = parts.document.replace('<head>', `<head>${csp}${bridge}`);
    $('render-status').textContent = parts.warnings.join(' ') || 'Updating preview…';
  }
  window.addEventListener('message', event => {
    if (event.source !== $('preview').contentWindow || event.data?.webBlocks !== previewToken) return;
    const { kind, text } = event.data;
    if (typeof text !== 'string') return;
    if (kind === 'ready') { if (!parts.warnings.length && !$('console').textContent.includes('error:')) $('render-status').textContent = 'Preview updated. Try your links, buttons and inputs.'; }
    else {
      $('console').textContent = ($('console').textContent + `${kind}: ${text}\n`).slice(-10000);
      if (kind === 'error') { $('render-status').textContent = `JavaScript needs a repair: ${text}`; $('console').closest('details').open = true; }
    }
  });
  function update() {
    parts = generate(current().workspace, $('title').value); codeView(); save();
    if ($('live').checked) preview();
    else $('render-status').textContent = 'Live updates paused. Restart preview to see your changes.';
    refreshOutline();
  }
  function apply(project, task, remember = true) {
    const checked = validateProject({ format: FORMAT, version: VERSION, ...project });
    if (remember) previous = current();
    loading = true; B.Events.disable();
    try {
      B.serialization.workspaces.load(checked.workspace, ws);
      if (project.arrange) {
        let x = 24;
        for (const b of ws.getTopBlocks(true)) {
          const xy = b.getRelativeToSurfaceXY(); b.moveBy(x - xy.x, 24 - xy.y);
          x += b.getHeightWidth().width + 64;
        }
      }
    }
    finally { B.Events.enable(); loading = false; }
    $('title').value = checked.title;
    $('task').textContent = task || 'Your saved website is ready. Change one thing, predict the result, and test it.';
    selectedId = ''; ws.clearUndo(); $('restore').disabled = !previous; refreshOutline(); inspect(); update();
    requestAnimationFrame(() => { B.svgResize(ws); ws.scroll(0, 0); });
  }
  function offer(projectFactory, explanation) {
    pending = projectFactory;
    $('confirm-text').textContent = `${explanation} Save a blocks file first if you want a permanent copy of your current work. Restore previous project can undo this replacement.`;
    $('confirm').hidden = false; $('confirm-yes').focus();
  }
  $('confirm-yes').addEventListener('click', () => {
    try { const result = pending(); protectedSave = false; apply(result, result.task); $('confirm').hidden = true; status('Project loaded.'); }
    catch (error) { status(`Could not load: ${error.message}`); }
  });
  $('confirm-no').addEventListener('click', () => { pending = null; $('confirm').hidden = true; });
  $('load').addEventListener('click', () => offer(() => makeStarter(starterSelect.value), `Load “${starters[starterSelect.value].name}” here?`));
  $('continue').addEventListener('click', () => {
    try {
      const data = localStorage.getItem(lastKey);
      if (!data) { status('No saved website yet. Open a blocks file or choose a starting project.'); return; }
      const project = validateProject(JSON.parse(data));
      offer(() => project, `Continue “${project.title}” from the most recently saved lesson?`);
    } catch { status('The last website could not be read. Open a blocks file instead.'); }
  });
  $('restore').addEventListener('click', () => { if (previous) { const backup = previous; apply(backup, 'Previous project restored.'); } });
  $('save').addEventListener('click', () => { download(`${slug}-blocks.json`, JSON.stringify(current(), null, 2), 'application/json'); status('Blocks file downloaded. Reopen it with Open blocks file.'); });
  $('download').addEventListener('click', () => { download('index.html', generate(current().workspace, $('title').value).document, 'text/html'); status('index.html downloaded. Open it in a browser, or edit it in VS Code.'); });
  $('file').addEventListener('change', async () => {
    const file = $('file').files[0]; if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('The file is too large (2 MB maximum).');
      const project = validateProject(JSON.parse(await file.text()));
      offer(() => project, `Open “${project.title}” from your blocks file?`);
    } catch (error) { status(`Could not open file: ${error.message} Your current work is unchanged.`); }
    $('file').value = '';
  });
  $('title').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 220); });
  $('undo').addEventListener('click', () => ws.undo(false)); $('redo').addEventListener('click', () => ws.undo(true));
  $('fit').addEventListener('click', () => ws.zoomToFit());
  section.querySelectorAll('[data-wb-jump]').forEach(button => button.addEventListener('click', () => {
    const b = ws.getTopBlocks(true).find(item => definitions[item.type].group === button.dataset.wbJump);
    if (!b) { status('Add a block from this language to start a new stack.'); return; }
    ws.setScale(0.7);
    const xy = b.getRelativeToSurfaceXY(); ws.scroll(16 - xy.x * ws.scale, 16 - xy.y * ws.scale);
    selectedId = b.id; refreshOutline(); inspect();
  }));
  $('run').addEventListener('click', () => { parts = generate(current().workspace, $('title').value); codeView(); preview(); });
  $('stop').addEventListener('click', () => { $('live').checked = false; previewToken = ''; $('preview').srcdoc = '<!doctype html><p>Preview stopped. Choose Restart preview to run it again.</p>'; $('render-status').textContent = 'Preview stopped. Your blocks are unchanged.'; });
  $('live').addEventListener('change', () => { if ($('live').checked) update(); });
  $('width').addEventListener('change', () => $('preview').classList.toggle('wb-phone', $('width').value === 'phone'));
  $('preview-jump').addEventListener('click', () => { section.querySelector('.wb-preview-pane').scrollIntoView({ block: 'start' }); $('width').focus({ preventScroll: true }); });
  $('builder-jump').addEventListener('click', () => { section.querySelector('.wb-inspector').open = true; $('select').scrollIntoView({ block: 'center' }); $('select').focus({ preventScroll: true }); });
  $('code-tab').addEventListener('change', codeView);
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(parts[$('code-tab').value]); status('Code copied.'); }
    catch { const range = document.createRange(); range.selectNodeContents($('code')); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); status('Code selected. Press Ctrl+C or Command+C to copy.'); }
  });
  $('add').addEventListener('click', () => {
    const type = $('type').value, def = definitions[type], target = selected(), place = $('place').value;
    let connection = null;
    if (place !== 'top') {
      if (!target) { status('Choose a block first.'); return; }
      const expected = place === 'after' ? definitions[target.type].group : definitions[target.type].inputs?.[place]?.[1];
      if (def.group !== expected) { status(`Choose a ${groups[expected]} block for this connection, or place it as a separate stack.`); return; }
      connection = place === 'after' ? target.nextConnection : target.getInput(place).connection;
      if (place !== 'after') while (connection.targetBlock()) connection = connection.targetBlock().nextConnection;
    }
    if (ws.getAllBlocks(false).length >= 600) { status('This workspace is full (600 blocks). Remove a block first.'); return; }
    B.Events.setGroup(true);
    try {
      const b = ws.newBlock(type); b.initSvg(); b.render();
      if (connection) connection.connect(b.previousConnection);
      else b.moveBy(24, Math.max(24, ...ws.getTopBlocks(false).filter(other => other !== b).map(other => other.getRelativeToSurfaceXY().y + other.getHeightWidth().height + 30)));
      selectBlock(b.id); status('Block added. Edit its fields above.');
    } finally { B.Events.setGroup(false); }
  });
  $('remove').addEventListener('click', () => {
    const b = selected(); if (!b) return;
    B.Events.setGroup(true); b.dispose(true); B.Events.setGroup(false); selectedId = ''; refreshOutline(); inspect(); status('Block removed. Undo block edit restores it, including its children.');
  });
  function move(direction) {
    const b = selected(); if (!b) return;
    const before = direction < 0 ? b.getPreviousBlock() : b;
    const after = direction < 0 ? b : b.getNextBlock();
    if (!before || !after) { status('This block is already at the end of its stack in that direction.'); return; }
    const parentConnection = before.previousConnection.targetConnection;
    const tail = after.nextConnection.targetConnection;
    const xy = before.getRelativeToSurfaceXY();
    B.Events.setGroup(true);
    try {
      before.previousConnection.disconnect(); before.nextConnection.disconnect(); after.nextConnection.disconnect();
      if (parentConnection) parentConnection.connect(after.previousConnection);
      else after.moveBy(xy.x - after.getRelativeToSurfaceXY().x, xy.y - after.getRelativeToSurfaceXY().y);
      after.nextConnection.connect(before.previousConnection);
      if (tail) before.nextConnection.connect(tail);
      status('Block moved within its stack.');
    } finally { B.Events.setGroup(false); }
  }
  $('up').addEventListener('click', () => move(-1)); $('down').addEventListener('click', () => move(1));
  ws.addChangeListener(event => {
    if (loading) return;
    if (event.type === B.Events.SELECTED) {
      if (event.newElementId && ws.getBlockById(event.newElementId)) { selectedId = event.newElementId; refreshOutline(); inspect(); }
      return;
    }
    if (event.isUiEvent) return;
    // Preserve the caret when a student types in the native inspector.
    if (event.type === B.Events.BLOCK_CHANGE && event.blockId === selectedId && !$('fields').contains(document.activeElement)) inspect();
    clearTimeout(timer); timer = setTimeout(update, 220);
  });
  const resize = () => B.svgResize(ws);
  new ResizeObserver(resize).observe($('canvas'));
  window.addEventListener('pagehide', () => { clearTimeout(timer); save(); });
  let initial = makeStarter(defaultStarter), note = '';
  // Capture the previous lesson before the first autosave in this one.
  let lastBeforeOpening = null;
  try { lastBeforeOpening = localStorage.getItem(lastKey); const saved = localStorage.getItem(storageKey); if (saved) initial = validateProject(JSON.parse(saved)); }
  catch { protectedSave = true; note = 'A saved project could not be read. It has not been overwritten. Save this work as a blocks file, or load a starting project to begin saving again.'; }
  apply(initial, initial.task, false);
  if (lastBeforeOpening) {
    // Keep Continue last website useful until the student makes their first edit.
    try { localStorage.setItem(lastKey, lastBeforeOpening); } catch { /* save() already reports storage failure */ }
  }
  if (note) $('storage').textContent = note;
  function offerExample(example) {
    offer(() => {
      const scaffold = makeStarter(defaultStarter);
      let stacks = scaffold.workspace.blocks.blocks;
      const { source, language, heading } = example;
      if (language === 'html') {
        let html = source, css = '', js = '';
        if (/<!doctype|<html[\s>]/i.test(source)) {
          const doc = new DOMParser().parseFromString(source, 'text/html');
          scaffold.title = doc.title || heading;
          css = [...doc.querySelectorAll('style')].map(n => n.textContent).join('\n');
          js = [...doc.querySelectorAll('script:not([src])')].map(n => n.textContent).join('\n');
          doc.querySelectorAll('style,script:not([src])').forEach(n => n.remove());
          html = doc.body.innerHTML;
          // Preserve external dependency declarations as visible, editable source.
          html += [...doc.head.querySelectorAll('link,script[src]')].map(n => n.outerHTML).join('\n');
        }
        stacks = [chain(htmlBlocks(html)), ...stacks.filter(s => definitions[s.type].group === 'CSS'), css && block('wb_css', { CODE: css }), js && block('wb_js', { CODE: js })].filter(Boolean);
      } else if (language === 'css') {
        const converted = cssBlocks(source);
        stacks = [...stacks.filter(s => definitions[s.type].group !== 'CSS'), converted.length ? chain(converted) : block('wb_css', { CODE: source })];
      } else stacks = [...stacks.filter(s => definitions[s.type].group !== 'JS'), block('wb_js', { CODE: source })];
      return { title: scaffold.title || heading, workspace: workspaceState(stacks), arrange: true, task: `Lesson example: ${heading}. ${language === 'html' ? 'HTML becomes nested blocks; the browser normalizes its markup.' : language === 'css' ? 'CSS becomes selector and property blocks where supported. The browser normalizes valid styles; compare with the original example below when debugging invalid CSS.' : 'This exact snippet is in an editable source block; its full text appears in Block fields.'} Partial examples may need the other steps from this lesson. Use the starting project for a complete working demonstration.` };
    }, `Try the ${example.language.toUpperCase()} example from “${example.heading}”?`);
  }
  return { resize, offerExample };
}
