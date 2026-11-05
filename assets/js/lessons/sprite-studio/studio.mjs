import { ACTIONS, DIRECTIONS, EXPRESSIONS, clone, keyFor, transform, flood, face, demoClip, createProject, validateProject, frameAt, clipMetadata } from './model.mjs';
import { STORAGE_KEY, readProject, writeProject, assetZip } from './project-io.mjs';

const $ = id => document.getElementById(`ss-${id}`);
let project = createProject(), action = 'idle', direction = 'right', index = 0;
let color = 1, tool = 'pencil', cursor = 0, past = [], future = [], playing = false, elapsed = 0, stroke = null;
let bootMessage = 'Example project ready. Edits save in this browser. Download JSON to keep a backup.';
try {
  const saved = readProject();
  if (saved) { project = saved; bootMessage = 'Your saved sprite project is restored.'; }
} catch { bootMessage = 'Browser storage is unavailable or its saved project cannot be read. Download project JSON to keep your work.'; }
direction = DIRECTIONS[project.view][0];
const clip = () => project.clips[keyFor(action, direction)];
const frame = () => clip().frames[index];
const say = message => { $('status').textContent = message; };
const cellName = value => value === '0' ? 'transparent' : `colour ${parseInt(value, 16)}, ${project.palette[parseInt(value, 16)]}`;
function save(message = 'Project saved in this browser.') {
  try { writeProject(project); say(message); }
  catch { say('Working in memory. Browser storage is unavailable or full. Save editable project JSON before closing.'); }
}
function snapshot() { return { project: clone(project), action, direction, index }; }
function remember(before = snapshot()) { past.push(before); if (past.length > 40) past.shift(); future = []; }
function stop() { playing = false; $('play').textContent = 'Play animation'; $('play').setAttribute('aria-pressed', 'false'); }
function change(fn, message) { endStroke(); stop(); remember(); fn(); index = Math.min(index, clip().frames.length - 1); sync(); save(message); }
function restore(state) { project = state.project; action = state.action; direction = state.direction; index = state.index; cursor = Math.min(cursor, project.size ** 2 - 1); stop(); sync(true); save('Project restored.'); }
function undo() { endStroke(); if (!past.length) return; future.push(snapshot()); restore(past.pop()); }
function redo() { endStroke(); if (!future.length) return; past.push(snapshot()); restore(future.pop()); }
function option(select, value, text) { const o = document.createElement('option'); o.value = value; o.textContent = text; select.append(o); }
Object.entries(ACTIONS).forEach(([key, spec]) => option($('action'), key, spec.title));
EXPRESSIONS.forEach(expression => option($('expression'), expression, expression[0].toUpperCase() + expression.slice(1)));
const toolButtons = new Map();
for (const [key, label] of [['pencil', 'Pencil'], ['eraser', 'Eraser'], ['fill', 'Fill'], ['picker', 'Pick colour']]) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
  b.addEventListener('click', () => { tool = key; updatePalette(); }); $('tools').append(b); toolButtons.set(key, b);
}
const swatches = project.palette.map((_, i) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ss-swatch';
  const number = document.createElement('span'); number.textContent = i; number.setAttribute('aria-hidden', 'true'); b.append(number);
  b.addEventListener('click', () => { color = i; if (tool === 'eraser' || tool === 'picker') tool = 'pencil'; updatePalette(); });
  $('palette').append(b); return b;
});
function updatePalette() {
  swatches.forEach((b, i) => {
    b.style.background = i ? project.palette[i] : 'repeating-conic-gradient(#e4eaf0 0 25%,#fff 0 50%) 0 0/12px 12px';
    b.setAttribute('aria-label', i ? `Colour ${i}: ${project.palette[i]}` : 'Colour 0: transparent / erase');
    b.setAttribute('aria-pressed', String(color === i));
  });
  toolButtons.forEach((b, key) => b.setAttribute('aria-pressed', String(tool === key)));
  $('colour').disabled = color === 0; $('colour').value = color ? project.palette[color] : '#000000';
  $('colour-name').textContent = color ? `Colour ${color}: ${project.palette[color]}` : 'Colour 0: transparent / erase';
  if (cells.length) updateCursor();
}
let cells = [], builtSize = 0;
function buildGrid() {
  builtSize = project.size; const grid = $('grid'); grid.replaceChildren(); grid.style.setProperty('--ss-size', project.size);
  grid.setAttribute('aria-rowcount', project.size); grid.setAttribute('aria-colcount', project.size);
  cells = [];
  for (let y = 0; y < project.size; y++) {
    const row = document.createElement('div'); row.setAttribute('role', 'row'); row.setAttribute('aria-rowindex', y + 1);
    for (let x = 0; x < project.size; x++) {
      const cell = document.createElement('button'); cell.type = 'button'; cell.className = 'ss-pixel'; cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-colindex', x + 1); cell.dataset.cell = y * project.size + x; cell.tabIndex = -1;
      cells.push(cell); row.append(cell);
    }
    grid.append(row);
  }
  $('x').max = $('y').max = project.size;
}
function updateCursor(focus = false) {
  cells.forEach((cell, i) => { cell.tabIndex = cursor === i ? 0 : -1; });
  const x = cursor % project.size, y = Math.floor(cursor / project.size);
  $('x').value = x + 1; $('y').value = y + 1;
  $('cell').textContent = `Column ${x + 1}, row ${y + 1}: ${cellName(frame().pixels[cursor])}. Tool: ${tool}.`;
  if (focus) cells[cursor].focus({ preventScroll: true });
}
function renderGrid() {
  if (builtSize !== project.size) buildGrid();
  const ghost = $('onion').checked && index > 0 ? clip().frames[index - 1].pixels : null;
  cells.forEach((cell, i) => {
    const px = frame().pixels[i], g = ghost?.[i];
    cell.style.backgroundColor = px !== '0' ? project.palette[parseInt(px, 16)] : g && g !== '0' ? `${project.palette[parseInt(g, 16)]}55` : 'transparent';
    cell.setAttribute('aria-label', `Column ${i % project.size + 1}, row ${Math.floor(i / project.size) + 1}: ${cellName(px)}`);
  });
  $('grid').classList.toggle('ss-no-lines', !$('lines').checked); updateCursor();
}
function bake(pixels, silhouette = false, source = project) {
  const c = document.createElement('canvas'); c.width = c.height = source.size;
  const ctx = c.getContext('2d'), img = ctx.createImageData(source.size, source.size);
  for (let i = 0; i < pixels.length; i++) {
    const slot = parseInt(pixels[i], 16); if (!slot) continue;
    const hex = silhouette ? '#1a1c2c' : source.palette[slot];
    img.data[i * 4] = parseInt(hex.slice(1, 3), 16); img.data[i * 4 + 1] = parseInt(hex.slice(3, 5), 16); img.data[i * 4 + 2] = parseInt(hex.slice(5, 7), 16); img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return c;
}
function drawPreview(showing = index) {
  const f = clip().frames[showing], canvas = $('preview'), ctx = canvas.getContext('2d'), bg = $('background').value;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = bg === 'dark' ? '#1a1c2c' : '#e4eaf0'; ctx.fillRect(0, 0, 192, 128);
  if (bg === 'checker') for (let y = 0; y < 128; y += 8) for (let x = 0; x < 192; x += 8) if ((x + y) % 16 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 8, 8); }
  // Silhouette stays visible on both test backgrounds.
  const image = bake(f.pixels, $('silhouette').checked);
  if ($('silhouette').checked && bg === 'dark') { const ic = image.getContext('2d'); ic.globalCompositeOperation = 'source-in'; ic.fillStyle = '#f4f4f4'; ic.fillRect(0, 0, project.size, project.size); }
  const scale = project.size === 16 ? 5 : 3;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(image, Math.floor((192 - project.size * scale) / 2), Math.floor((128 - project.size * scale) / 2), project.size * scale, project.size * scale);
  const actual = $('actual'); actual.width = actual.height = project.size; actual.getContext('2d').drawImage(bake(f.pixels), 0, 0);
  const text = `${ACTIONS[action].title}, facing ${direction}. Pose ${showing + 1} of ${clip().frames.length}: ${f.label || 'Untitled pose'}. ${f.ms} ms.`;
  $('playhead').textContent = text; canvas.setAttribute('aria-label', text);
  actual.setAttribute('aria-label', `${text} Shown at native ${project.size} pixel size.`);
  $('actual-label').textContent = `1× native size (${project.size} × ${project.size})`;
}
function renderFrames() {
  const focused = document.activeElement?.closest('[data-frame]')?.dataset.frame;
  const strip = $('frames'); strip.replaceChildren();
  clip().frames.forEach((f, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ss-frame'; b.dataset.frame = i;
    b.setAttribute('aria-label', `Frame ${i + 1}: ${f.label || 'Untitled pose'}, ${f.ms} milliseconds`); b.setAttribute('aria-pressed', String(i === index));
    const canvas = bake(f.pixels); canvas.setAttribute('aria-hidden', 'true'); const label = document.createElement('span'); label.textContent = `${i + 1} / ${f.ms} ms`;
    b.append(canvas, label); b.addEventListener('click', () => { endStroke(); stop(); index = i; sync(); strip.querySelector(`[data-frame="${i}"]`).focus({ preventScroll: true }); }); strip.append(b);
  });
  if (focused !== undefined) strip.querySelector(`[data-frame="${Math.min(Number(focused), clip().frames.length - 1)}"]`)?.focus({ preventScroll: true });
}
function sync(rebuildDirections = false) {
  if (rebuildDirections || !$('direction').options.length) {
    $('direction').replaceChildren(); DIRECTIONS[project.view].forEach(dir => option($('direction'), dir, dir[0].toUpperCase() + dir.slice(1)));
  }
  $('name').value = project.name; $('description').value = project.description;
  $('project-info').textContent = `${project.size} × ${project.size} · ${project.view === 'side' ? 'Side-scrolling' : 'Top-down'} · ${DIRECTIONS[project.view].length} directions`;
  $('action').value = action; $('direction').value = direction; $('recipe').textContent = ACTIONS[action].tip;
  $('pose').value = frame().label; $('duration').value = frame().ms; $('loop').checked = clip().loop;
  $('undo').disabled = !past.length; $('redo').disabled = !future.length;
  $('delete').disabled = clip().frames.length === 1; $('duplicate').disabled = $('add').disabled = clip().frames.length >= 24;
  $('earlier').disabled = index === 0; $('later').disabled = index === clip().frames.length - 1;
  $('face').disabled = direction === 'up'; $('courier').disabled = project.size !== 16;
  updatePalette(); renderGrid(); renderFrames(); drawPreview();
}
function setPixel(x, y, value) {
  const at = y * project.size + x; frame().pixels = frame().pixels.slice(0, at) + value + frame().pixels.slice(at + 1);
}
function apply(x, y, erase = false) {
  if (tool === 'picker' && !erase) { color = parseInt(frame().pixels[y * project.size + x], 16); tool = 'pencil'; updatePalette(); return; }
  const value = erase || tool === 'eraser' ? '0' : color.toString(16);
  if (tool === 'fill' && !erase) {
    frame().pixels = flood(frame().pixels, project.size, x, y, value);
    if ($('mirror').checked) frame().pixels = flood(frame().pixels, project.size, project.size - 1 - x, y, value);
  } else { setPixel(x, y, value); if ($('mirror').checked) setPixel(project.size - 1 - x, y, value); }
}
function point(event) {
  const rect = $('grid').getBoundingClientRect(), size = project.size;
  return { x: Math.max(0, Math.min(size - 1, Math.floor((event.clientX - rect.left) / rect.width * size))), y: Math.max(0, Math.min(size - 1, Math.floor((event.clientY - rect.top) / rect.height * size))) };
}
function endStroke() {
  if (!stroke) return;
  const previous = stroke; stroke = null;
  if (previous.before.project.clips[keyFor(action, direction)].frames[index].pixels !== frame().pixels) { remember(previous.before); save(); }
  sync();
}
$('grid').addEventListener('pointerdown', event => {
  if (event.button !== 0 || stroke) return;
  event.preventDefault(); stop(); const p = point(event); cursor = p.y * project.size + p.x;
  if (tool === 'picker') { apply(p.x, p.y); renderGrid(); updateCursor(true); return; }
  stroke = { before: snapshot(), last: p, pointer: event.pointerId }; $('grid').setPointerCapture(event.pointerId);
  apply(p.x, p.y); renderGrid(); drawPreview(); updateCursor(true);
});
$('grid').addEventListener('pointermove', event => {
  if (!stroke || event.pointerId !== stroke.pointer || tool === 'fill') return;
  const p = point(event), from = stroke.last, distance = Math.max(Math.abs(p.x - from.x), Math.abs(p.y - from.y));
  for (let step = 1; step <= distance; step++) apply(Math.round(from.x + (p.x - from.x) * step / distance), Math.round(from.y + (p.y - from.y) * step / distance));
  stroke.last = p; cursor = p.y * project.size + p.x; renderGrid(); drawPreview();
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) $('grid').addEventListener(event, endStroke);
$('grid').addEventListener('focusin', event => { if (event.target.dataset.cell !== undefined) { cursor = Number(event.target.dataset.cell); updateCursor(); } });
$('grid').addEventListener('click', event => {
  if (event.detail !== 0 || event.target.dataset.cell === undefined) return;
  cursor = Number(event.target.dataset.cell);
  change(() => apply(cursor % project.size, Math.floor(cursor / project.size)));
});
$('grid').addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const size = project.size, x = cursor % size, y = Math.floor(cursor / size);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const moves = { ArrowLeft: y * size + Math.max(0, x - 1), ArrowRight: y * size + Math.min(size - 1, x + 1), ArrowUp: Math.max(0, y - 1) * size + x, ArrowDown: Math.min(size - 1, y + 1) * size + x, Home: event.ctrlKey ? 0 : y * size, End: y * size + size - 1 };
    cursor = moves[event.key]; updateCursor(true);
  } else if ([' ', 'Enter', 'Delete', 'Backspace'].includes(event.key)) {
    event.preventDefault(); if (event.repeat) return;
    if (tool === 'picker' && (event.key === ' ' || event.key === 'Enter')) { apply(x, y); renderGrid(); }
    else change(() => apply(x, y, event.key === 'Delete' || event.key === 'Backspace'));
    updateCursor(true);
  }
});
$('paint-cell').addEventListener('click', () => {
  if (!$('x').reportValidity() || !$('y').reportValidity() || !Number.isInteger(Number($('x').value)) || !Number.isInteger(Number($('y').value))) return;
  cursor = (Number($('y').value) - 1) * project.size + Number($('x').value) - 1;
  if (tool === 'picker') { apply(cursor % project.size, Math.floor(cursor / project.size)); renderGrid(); }
  else change(() => apply(cursor % project.size, Math.floor(cursor / project.size)));
});
$('undo').onclick = undo; $('redo').onclick = redo;
document.querySelector('.ss-studio').addEventListener('keydown', event => {
  if (event.target.matches('input, textarea, select') || !(event.ctrlKey || event.metaKey) || event.altKey) return;
  if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
  if (event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
});
for (const id of ['action', 'direction']) $(id).addEventListener('change', () => { endStroke(); stop(); action = $('action').value; direction = $('direction').value; index = 0; elapsed = 0; sync(); });
for (const id of ['onion', 'lines']) $(id).onchange = renderGrid;
for (const id of ['background', 'silhouette']) $(id).onchange = () => drawPreview();
$('colour').addEventListener('change', event => { const value = event.target.value; change(() => { project.palette[color] = value; }, 'Palette colour updated in every clip.'); });
for (const [id, field] of [['name', 'name'], ['description', 'description']]) $(id).addEventListener('change', event => {
  const value = event.target.value; change(() => { project[field] = value; });
});
$('pose').onchange = event => { const label = event.target.value; change(() => { frame().label = label; }); };
$('duration').onchange = event => {
  if (!event.target.reportValidity() || !Number.isInteger(Number(event.target.value))) { event.target.value = frame().ms; return; }
  const ms = Number(event.target.value); change(() => { frame().ms = ms; });
};
$('loop').onchange = event => { const loop = event.target.checked; change(() => { clip().loop = loop; }); };
$('duplicate').onclick = () => { if (clip().frames.length >= 24) return; change(() => { clip().frames.splice(index + 1, 0, clone(frame())); index++; }, 'Frame duplicated. Change the next pose by a few pixels.'); };
$('add').onclick = () => { if (clip().frames.length >= 24) return; change(() => { clip().frames.splice(index + 1, 0, { pixels: '0'.repeat(project.size ** 2), ms: 150, label: 'New pose' }); index++; }, 'Blank frame added.'); };
$('delete').onclick = () => { if (clip().frames.length < 2) return; change(() => { clip().frames.splice(index, 1); index = Math.min(index, clip().frames.length - 1); }, 'Frame deleted. Undo restores it.'); };
for (const [id, delta] of [['earlier', -1], ['later', 1]]) $(id).onclick = () => {
  const dest = index + delta; if (dest < 0 || dest >= clip().frames.length) return;
  change(() => { const frames = clip().frames; [frames[index], frames[dest]] = [frames[dest], frames[index]]; index = dest; });
};
document.querySelectorAll('[data-transform]').forEach(button => button.onclick = () => change(() => { frame().pixels = transform(frame().pixels, project.size, button.dataset.transform); }, 'Frame transformed. Undo restores cropped pixels.'));
$('clear').onclick = () => change(() => { frame().pixels = '0'.repeat(project.size ** 2); }, 'Frame cleared. Undo restores it.');
$('face').onclick = () => change(() => { frame().pixels = face(frame().pixels, project.size, $('expression').value, direction); }, 'Face stamp applied to the example head area. Undo restores the previous face.');
$('demo').onclick = () => change(() => { project.clips[keyFor(action, direction)] = demoClip(action, direction, project.size); index = 0; }, 'This action and direction now use the editable example. Undo restores your clip.');
$('new').onclick = () => { $('new-view').value = project.view; $('new-size').value = project.size; $('new-dialog').returnValue = ''; $('new-dialog').showModal(); };
$('new-dialog').addEventListener('close', () => {
  if ($('new-dialog').returnValue !== 'create') return;
  change(() => { project = createProject($('new-view').value, Number($('new-size').value), $('new-blank').value === 'blank'); direction = DIRECTIONS[project.view][0]; action = 'idle'; index = cursor = 0; }, 'New project ready. Undo restores your previous project.'); sync(true);
});
$('play').onclick = () => {
  if (playing) { stop(); drawPreview(); return; }
  endStroke(); elapsed = 0; playing = true; $('play').textContent = 'Pause animation'; $('play').setAttribute('aria-pressed', 'true'); drawPreview(frameAt(clip(), elapsed));
};
$('step').onclick = () => { endStroke(); stop(); index = (index + 1) % clip().frames.length; sync(); };
let lastShown = -1;
window.SimKit.loop(dt => {
  if (!playing) return;
  elapsed += dt * 1000; const showing = frameAt(clip(), elapsed);
  if (showing !== lastShown) { drawPreview(showing); lastShown = showing; }
  const total = clip().frames.reduce((sum, f) => sum + f.ms, 0);
  if (!clip().loop && elapsed >= total) { index = clip().frames.length - 1; stop(); sync(); }
}, { el: document.querySelector('.ss-studio') });
document.addEventListener('visibilitychange', () => { if (document.hidden) { endStroke(); stop(); } });
window.addEventListener('pagehide', endStroke);
function download(name, data, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const asPNG = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed.'))));
function sheet(source, frames) {
  const canvas = document.createElement('canvas'); canvas.width = source.size * frames.length; canvas.height = source.size;
  frames.forEach((f, i) => canvas.getContext('2d').drawImage(bake(f.pixels, false, source), i * source.size, 0)); return canvas;
}
$('save').onclick = () => { endStroke(); download('my-sprite.sprite.json', JSON.stringify(project, null, 2), 'application/json'); say('Editable project downloaded. Open this JSON here to continue on another device.'); };
$('png').onclick = async () => {
  try { endStroke(); const key = keyFor(action, direction), number = index + 1; download(`${key}-frame-${number}.png`, await asPNG(bake(frame().pixels)), 'image/png'); say('Native-size frame PNG downloaded.'); } catch (error) { say(error.message); }
};
$('sheet').onclick = async () => {
  try { endStroke(); const key = keyFor(action, direction); download(`${key}.png`, await asPNG(sheet(project, clip().frames)), 'image/png'); say('Clip sheet downloaded. Slice it into square frames at the project resolution.'); } catch (error) { say(error.message); }
};
$('timing').onclick = () => { endStroke(); download(`${keyFor(action, direction)}.json`, JSON.stringify(clipMetadata(project, action, direction), null, 2), 'application/json'); say('Clip timing JSON downloaded. Use it with the matching clip sheet PNG.'); };
$('zip').onclick = async () => {
  const button = $('zip'); button.disabled = true;
  try {
    endStroke(); const source = clone(project); say('Packing every action and direction…');
    if (!window.JSZip) throw new Error('ZIP library did not load. Download the editable JSON and individual PNG sheets, or reload and try again.');
    const zip = await assetZip(source);
    zip.file('README.txt', 'SPRITE STUDIO ASSETS\n\nOpen project.sprite.json in the ClassroomOS Pixel Sprite Studio to edit every clip. Each PNG is one horizontal strip with native-size square frames. animations.json records frame rectangles, individual durations in milliseconds, loop settings, facing and pose descriptions. Use nearest-neighbour filtering in your engine. Frame PNG alpha is transparency.\n\nThe 32-pixel example starts as a doubled 16-pixel drawing; add original details to use the extra resolution. These are original classroom teaching examples. Retain credit in the project description for any artwork you imported.\n\nThese assets do not include a game engine. Connect states, movement, jump physics, directional attacks, hitboxes, potion effects, health, game-over and retry logic in your game. A one-shot clip holds its final pose; a looping clip repeats. Top-down artwork needs separate up/down views.\n');
    download('my-sprite-animations.zip', await zip.generateAsync({ type: 'blob' })); say('All clips exported with editable project and timing data.');
  } catch (error) { say(`Export failed: ${error.message}`); }
  finally { button.disabled = false; }
};
async function readFile(input, read) {
  const file = input.files[0]; if (!file) return;
  endStroke(); const before = JSON.stringify(project);
  try {
    if (file.size > 4 * 1024 * 1024) throw new Error('Choose a file smaller than 4 MB.');
    const result = await read(file);
    if (before !== JSON.stringify(project)) throw new Error('Your project changed while the file opened. Choose the file again.');
    change(result, 'File opened. Undo restores your previous work.'); sync(true);
  } catch (error) { say(`Could not open file: ${error.message}`); }
  finally { input.value = ''; }
}
$('open').onchange = event => readFile(event.target, async file => {
  const incoming = validateProject(JSON.parse(await file.text()));
  return () => { project = incoming; action = 'idle'; direction = DIRECTIONS[project.view][0]; index = cursor = 0; };
});
function nearest(r, g, b, palette) {
  let best = 1, distance = Infinity;
  for (let i = 1; i < 16; i++) {
    const hex = palette[i], d = (r - parseInt(hex.slice(1, 3), 16)) ** 2 + (g - parseInt(hex.slice(3, 5), 16)) ** 2 + (b - parseInt(hex.slice(5, 7), 16)) ** 2;
    if (d < distance) { distance = d; best = i; }
  }
  return best.toString(16);
}
$('import-png').onchange = event => {
  const targetKey = keyFor(action, direction), targetIndex = index;
  return readFile(event.target, async file => {
    // Check the PNG header before decoding, avoiding accidental large-sheet imports.
    const header = new Uint8Array(await file.slice(0, 24).arrayBuffer());
    if (header.length < 24 || [137, 80, 78, 71, 13, 10, 26, 10].some((v, i) => header[i] !== v)) throw new Error('Choose a PNG image.');
    const dimensions = new DataView(header.buffer);
    if (dimensions.getUint32(16) !== project.size || dimensions.getUint32(20) !== project.size) throw new Error(`Choose a single ${project.size} × ${project.size} PNG frame, rather than a sprite sheet.`);
    const bitmap = await createImageBitmap(file);
    const c = document.createElement('canvas'); c.width = c.height = project.size; c.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close();
    const rgba = c.getContext('2d').getImageData(0, 0, project.size, project.size).data; let pixels = '';
    for (let i = 0; i < rgba.length; i += 4) pixels += rgba[i + 3] < 128 ? '0' : nearest(rgba[i], rgba[i + 1], rgba[i + 2], project.palette);
    return () => { project.clips[targetKey].frames[targetIndex].pixels = pixels; action = targetKey.slice(0, targetKey.lastIndexOf('-')); direction = targetKey.slice(targetKey.lastIndexOf('-') + 1); index = targetIndex; };
  });
};
$('from-courier').onclick = () => change(() => {
  const art = window.PixelCourier.store.load(), incoming = art.sprites.courier.anims.idle.frames[0];
  frame().pixels = Array.from({ length: project.size ** 2 }, (_, i) => {
    const ratio = project.size / 16, sourceX = Math.floor((i % project.size) / ratio), sourceY = Math.floor(Math.floor(i / project.size) / ratio);
    const px = incoming[sourceY * 16 + sourceX]; if (px === '0') return '0';
    const hex = art.palette[parseInt(px, 16)];
    return nearest(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), project.palette);
  }).join('');
  frame().label = 'Imported pathway courier pose';
}, 'Pathway courier copied into this frame. Undo restores your previous pose.');
$('courier').onclick = () => {
  endStroke(); if (project.size !== 16) return;
  const palette = window.PixelCourier.store.load().palette;
  const pixels = frame().pixels.split('').map(px => {
    if (px === '0') return '0'; const hex = project.palette[parseInt(px, 16)];
    return nearest(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), palette);
  }).join('');
  window.PixelCourier.store.update(art => { art.sprites.courier.anims.idle.frames[0] = pixels; });
  say('Pose copied to the pathway courier’s first idle frame. Other pathway animations keep their existing art. Studio edits continue in this project.');
};
document.querySelectorAll('[data-ss-inspect]').forEach(button => button.onclick = () => {
  endStroke(); stop(); action = button.dataset.ssInspect; index = 0; sync();
  document.querySelector('.ss-studio').scrollIntoView({ behavior: 'instant', block: 'start' }); $('action').focus({ preventScroll: true });
  say(`Inspecting your ${ACTIONS[action].title.toLowerCase()} clip. Step through its poses, or replace this clip with the example.`);
});
document.querySelectorAll('[data-ss-top]').forEach(button => button.onclick = () => { $('new-view').value = 'top'; $('new-size').value = project.size; $('new-dialog').returnValue = ''; $('new-dialog').showModal(); });
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) say('The shared project changed in another tab. Save this project JSON to keep your current version, then reload this page to open the saved version.');
});
const route = new URLSearchParams(location.search);
if (Object.hasOwn(ACTIONS, route.get('action'))) action = route.get('action');
if (DIRECTIONS[project.view].includes(route.get('facing'))) direction = route.get('facing');
sync(true); say(bootMessage);
