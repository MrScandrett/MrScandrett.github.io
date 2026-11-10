(function(){'use strict';
const app=document.querySelector('[data-blueprint-app]');if(!app)return;
// The format code (dxf.mjs) and the tool hand-off are modules; load them now
// so "Build it in Workbench" can open its tab straight from the click.
const scriptUrl = document.currentScript?.src || new URL('../../../assets/js/lessons/blueprint-drafting.js', location.href).href;
const modules = { dxf: null, handoff: null };
const loading = Promise.all([
  import(new URL('../dxf.mjs', scriptUrl).href).then(m => { modules.dxf = m; }),
  import(new URL('../handoff.mjs', scriptUrl).href).then(m => { modules.handoff = m; })
]);
loading.catch(() => {});
const svg=app.querySelector('[data-sheet]'),drawing=app.querySelector('[data-drawing]'),preview=app.querySelector('[data-preview]'),status=app.querySelector('[data-status]'),cursor=app.querySelector('[data-cursor]'),lineType=app.querySelector('[data-line-type]');
const NS = 'http://www.w3.org/2000/svg';
const storageKey = 'classroomos-blueprint-v1';
const views = ['front', 'top', 'right'];
const coordinates = ['x1', 'y1', 'x2', 'y2'];
const shapeKinds = { rect: 'Rectangle', line: 'Line', dimension: 'Dimension' };
const projectTitle = app.querySelector('[data-project-title]');
const projectGuide = app.querySelector('[data-project-guide]');
const projectStatus = app.querySelector('[data-project-status]');
const shapeChoice = app.querySelector('[data-shape-choice]');
const shapeEdit = app.querySelector('[data-shape-edit]');
const shapeStatus = app.querySelector('[data-shape-status]');
const deleteButton = app.querySelector('[data-action="delete"]');
let tool = 'select', view = 'front', gesture = null, selected = null, viewsReady = false;
const undoStack = [], redoStack = [];

function makeProject(title, guide, drawings = {}) {
  return { version: 1, title, guide, views: { front: [], top: [], right: [], ...drawings } };
}

function coordinateLimit(axis) {
  return axis.startsWith('x') ? 800 : 500;
}

function readProject(data) {
  if (data?.version !== 1 || typeof data.title !== 'string' || !data.title.trim() ||
      data.title.length > 36 || /[\x00-\x1f]/.test(data.title) ||
      !['desk', 'custom'].includes(data.guide)) throw new Error('Invalid project');
  const drawings = {};
  for (const name of views) {
    const shapes = data.views?.[name];
    if (!Array.isArray(shapes)) throw new Error('Invalid view');
    drawings[name] = shapes.map(shape => {
      if (!Object.hasOwn(shapeKinds, shape?.kind) || !['object', 'hidden', 'center'].includes(shape.type)) {
        throw new Error('Invalid shape');
      }
      const clean = { kind: shape.kind, type: shape.type };
      for (const axis of coordinates) {
        const value = shape[axis];
        if (!Number.isInteger(value) || value < 0 || value > coordinateLimit(axis)) {
          throw new Error('Invalid coordinate');
        }
        clean[axis] = value;
      }
      return clean;
    });
  }
  return makeProject(data.title.trim(), data.guide, drawings);
}

let project = makeProject('Desk organizer', 'desk');
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved) {
    // Older drafts stored the three view arrays directly.
    project = readProject(saved.version === undefined ? makeProject(project.title, project.guide, saved) : saved);
  }
} catch {
  projectStatus.textContent = 'The saved draft could not be read. Open a project file or start a new drawing.';
}

function checkpoint() {
  undoStack.push(JSON.stringify(project));
  if (undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
}

function cancel() {
  gesture = null;
  preview.replaceChildren();
  drawing.querySelector('.is-moving')?.classList.remove('is-moving');
}

const hints = {
  select: 'Select or drag an edge to move a shape. Use Edit shape for precise changes.',
  line: 'Drag between two points. Hold Shift for a horizontal or vertical edge.',
  rect: 'Drag opposite corners. Each small grid square represents 10 mm.',
  dimension: 'Drag between endpoints to measure. Place dimensions beside the object.'
};

function point(event, constrain = false) {
  const p = svg.createSVGPoint();
  p.x = event.clientX;
  p.y = event.clientY;
  const local = p.matrixTransform(svg.getScreenCTM().inverse());
  const step = Number(app.querySelector('[data-snap]').value);
  let x = Math.max(0, Math.min(800, Math.round(local.x / step) * step));
  let y = Math.max(0, Math.min(500, Math.round(local.y / step) * step));
  if (constrain && event.shiftKey) {
    const start = gesture.start;
    if (Math.abs(x - start.x) > Math.abs(y - start.y)) y = start.y;
    else x = start.x;
  }
  return { x, y };
}
function el(name,attrs={}){const n=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n}
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(project));
  } catch {
    app.querySelector('.bp-save-note').textContent = 'Browser autosave is unavailable. Save a project file to keep editing later.';
  }
}
function shapeNode(s,i){let n;if(s.kind==='rect')n=el('rect',{x:Math.min(s.x1,s.x2),y:Math.min(s.y1,s.y2),width:Math.abs(s.x2-s.x1),height:Math.abs(s.y2-s.y1)});else n=el('line',{x1:s.x1,y1:s.y1,x2:s.x2,y2:s.y2});n.classList.add(s.kind==='dimension'?'draft-dimension':'draft-object');if(s.type==='hidden')n.classList.add('draft-hidden');if(s.type==='center')n.classList.add('draft-center');n.dataset.index=i;if(s.kind==='dimension'){const dx=s.x2-s.x1,dy=s.y2-s.y1,mm=Math.round(Math.hypot(dx,dy)/2);const t=el('text',{x:(s.x1+s.x2)/2,y:(s.y1+s.y2)/2-8,'text-anchor':'middle',class:'draft-dimension-text'});t.textContent=mm+' mm';const g=el('g',{'data-index':i});g.append(n,t);return g}return n}
function selectShape(index) {
  selected = index;
  const shape = project.views[view][index];
  drawing.querySelectorAll('.is-selected').forEach(node => node.classList.remove('is-selected'));
  if (shape) drawing.children[index].classList.add('is-selected');
  shapeChoice.value = shape ? String(index) : '';
  shapeEdit.hidden = deleteButton.disabled = !shape;
  shapeStatus.textContent = '';
  if (shape) {
    for (const axis of coordinates) shapeEdit.elements[axis].value = shape[axis] / 2;
  }
}

function viewLabel(name) {
  return name.toUpperCase() + ' VIEW · 1 square = 10 mm';
}

function render(index = null) {
  const shapes = project.views[view];
  drawing.replaceChildren(...shapes.map(shapeNode));
  shapeChoice.replaceChildren(new Option('Select a shape', ''), ...shapes.map((shape, i) =>
    new Option((i + 1) + '. ' + shapeKinds[shape.kind], String(i))
  ));
  shapeChoice.disabled = !shapes.length;
  selectShape(index);
  projectTitle.value = project.title;
  projectGuide.value = project.guide;
  const sheetName = app.querySelector('[data-sheet-name]');
  sheetName.textContent = project.title;
  // Fit long titles within the title block at the board's native scale.
  sheetName.removeAttribute('textLength');
  if (sheetName.getComputedTextLength() > 262) {
    sheetName.setAttribute('textLength', '262');
    sheetName.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  app.querySelector('[data-view-label]').textContent = viewLabel(view);
  review();
}
function review(){
 const all=Object.values(project.views),flat=all.flat(),geometry=flat.filter(x=>x.kind!=='dimension');
 viewsReady=all.every(a=>a.some(x=>x.kind!=='dimension'));
 setCheck('views',viewsReady);
 setCheck('dimensions',all.every(a=>a.some(x=>x.kind==='dimension')));
 setCheck('line',geometry.some(x=>x.type==='hidden'||x.type==='center'));
 setCheck('fit',geometry.length>0&&flat.every(x=>Math.min(x.x1,x.x2)>=20&&Math.max(x.x1,x.x2)<=780&&Math.min(x.y1,x.y2)>=60&&Math.max(x.y1,x.y2)<=480&&!(Math.max(x.x1,x.x2)>495&&Math.max(x.y1,x.y2)>400)));
 app.querySelector('[data-progress]').textContent=app.querySelectorAll('.bp-checks .is-done').length+' / 4';
 const hasOutline=project.views[view].some(x=>x.kind!=='dimension'),hasDim=project.views[view].some(x=>x.kind==='dimension');
 const guides={front:'Front = width × height. Limit: 120 × 80 mm. Match width in the top view and height in the right view.',top:'Top = width × depth. Limit: 120 × 90 mm. Locate the phone slot and pencil compartment here.',right:'Right = depth × height. Limit: 90 × 80 mm. Use hidden lines for features behind a visible face.'};
 app.querySelector('[data-view-guide]').textContent = project.guide === 'desk' ? guides[view] : {
   front: 'Front shows width × height. Pick the side that best explains your object.',
   top: 'Top shows width × depth. Check that it matches the front view’s width.',
   right: 'Right shows depth × height. Match depth to the top and height to the front.'
 }[view];
 app.querySelector('[data-coach-title]').textContent=!hasOutline?'01 / Establish the silhouette':!hasDim?'02 / Communicate size':'03 / Resolve the details';
 app.querySelector('[data-coach]').textContent=!hasOutline?'Choose Rectangle and drag the outside shape. Count grid squares: each is 10 mm. Leave room around the outline for dimensions.':!hasDim?'Choose Dimension. Drag across the width or height of an edge; the label reports its length in mm. Keep labels readable.':'Add the interior features, then show an unseen edge with Hidden line. Switch views and check that shared dimensions agree.';
 app.querySelector('[data-action="undo"]').disabled=!undoStack.length;
 app.querySelector('[data-action="redo"]').disabled=!redoStack.length;
}
function setCheck(name,on){app.querySelector('[data-check="'+name+'"]').classList.toggle('is-done',on)}
function setTool(next){cancel();tool=next;app.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));status.textContent=hints[tool]}
app.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
app.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{cancel();view=b.dataset.view;app.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));render();status.textContent=view[0].toUpperCase()+view.slice(1)+' view ready.'}));
const viewTabs=[...app.querySelectorAll('[data-view]')];
viewTabs.forEach((tab,index)=>tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(index+(e.key==='ArrowRight'?1:2))%3;viewTabs[next].focus();viewTabs[next].click()}));
function shapeAt(p) {
  const { start, original } = gesture;
  if (!original) return { kind: tool, type: lineType.value, x1: start.x, y1: start.y, x2: p.x, y2: p.y };

  const dx = Math.max(-Math.min(original.x1, original.x2),
    Math.min(800 - Math.max(original.x1, original.x2), p.x - start.x));
  const dy = Math.max(-Math.min(original.y1, original.y2),
    Math.min(500 - Math.max(original.y1, original.y2), p.y - start.y));
  return { ...original, x1: original.x1 + dx, x2: original.x2 + dx, y1: original.y1 + dy, y2: original.y2 + dy };
}

svg.addEventListener('pointerdown', event => {
  if (event.button !== 0 || gesture) return;
  svg.focus();
  if (tool === 'select') {
    const target = event.target.closest('[data-index]');
    selectShape(target && drawing.contains(target) ? Number(target.dataset.index) : null);
    status.textContent = selected === null ? 'No shape selected.' : hints.select;
    if (selected === null) return;
  }
  gesture = {
    pointer: event.pointerId,
    start: point(event),
    original: tool === 'select' ? project.views[view][selected] : null
  };
  svg.setPointerCapture(event.pointerId);
});

svg.addEventListener('pointermove', event => {
  const p = point(event, gesture?.pointer === event.pointerId && tool !== 'rect');
  cursor.textContent = p.x / 2 + ', ' + p.y / 2 + ' mm';
  if (gesture?.pointer !== event.pointerId) return;
  const shape = shapeAt(p);
  preview.replaceChildren(shapeNode(shape, -1));
  if (gesture.original) {
    drawing.children[selected].classList.add('is-moving');
    status.textContent = 'Release to move the shape.';
  } else {
    const dx = shape.x2 - shape.x1;
    const dy = shape.y2 - shape.y1;
    status.textContent = tool === 'rect' ? 'Width ' + Math.abs(dx) / 2 + ' mm × height ' + Math.abs(dy) / 2 + ' mm' :
      Math.round(Math.hypot(dx, dy) / 2) + ' mm · release to place';
  }
});

for (const eventName of ['pointercancel', 'lostpointercapture']) {
  svg.addEventListener(eventName, event => {
    if (gesture?.pointer === event.pointerId) cancel();
  });
}

svg.addEventListener('pointerup', event => {
  if (gesture?.pointer !== event.pointerId) return;
  const shape = shapeAt(point(event, tool !== 'rect'));
  const original = gesture.original;
  cancel();
  if (original && coordinates.every(axis => shape[axis] === original[axis])) return;
  if (!original && !hasSize(shape)) {
    status.textContent = 'Drag farther to give the shape a size.';
    return;
  }
  checkpoint();
  if (original) project.views[view][selected] = shape;
  else project.views[view].push(shape);
  save();
  render(original ? selected : null);
  status.textContent = original ? 'Shape moved.' : shapeKinds[tool] + ' added to the ' + view + ' view.';
});

shapeChoice.addEventListener('change', () => {
  cancel();
  setTool('select');
  selectShape(shapeChoice.value === '' ? null : Number(shapeChoice.value));
});

function hasSize(shape) {
  const width = shape.x1 !== shape.x2;
  const height = shape.y1 !== shape.y2;
  return shape.kind === 'rect' ? width && height : width || height;
}

shapeEdit.addEventListener('submit', event => {
  event.preventDefault();
  if (selected === null) return;
  cancel();
  const original = project.views[view][selected];
  const shape = { ...original };
  for (const axis of coordinates) shape[axis] = shapeEdit.elements[axis].valueAsNumber * 2;
  if (!hasSize(shape)) {
    shapeStatus.textContent = 'Enter coordinates that give the shape a length' + (shape.kind === 'rect' ? ' and width.' : '.');
    return;
  }
  if (coordinates.some(axis => shape[axis] !== original[axis])) {
    checkpoint();
    project.views[view][selected] = shape;
    save();
    render(selected);
  }
  shapeStatus.textContent = 'Coordinates updated.';
});

function removeSelected() {
  if (selected === null) return;
  cancel();
  checkpoint();
  project.views[view].splice(selected, 1);
  save();
  render();
  status.textContent = 'Selected shape removed.';
}
app.addEventListener('keydown',e=>{if(/input|select|textarea/i.test(e.target.tagName))return;if(e.key==='Escape'){cancel();return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey);return}if(e.ctrlKey||e.metaKey||e.altKey)return;const map={v:'select',l:'line',r:'rect',d:'dimension'};if(map[e.key.toLowerCase()])setTool(map[e.key.toLowerCase()]);if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelected()}});
function history(redo=false){const from=redo?redoStack:undoStack,to=redo?undoStack:redoStack;if(!from.length)return;cancel();to.push(JSON.stringify(project));project=JSON.parse(from.pop());save();render();status.textContent=redo?'Change restored.':'Change undone.'}
app.querySelector('[data-action="undo"]').addEventListener('click',()=>history());
app.querySelector('[data-action="redo"]').addEventListener('click',()=>history(true));
app.querySelector('[data-action="delete"]').addEventListener('click',removeSelected);
app.querySelector('[data-action="clear"]').addEventListener('click',()=>{if(!project.views[view].length)return;cancel();checkpoint();project.views[view]=[];save();render();status.textContent=view+' view cleared. Undo restores it.'});
app.querySelector('[data-zoom]').addEventListener('change',e=>{svg.style.width=(Number(e.target.value)*100)+'%'});
const fullscreenButton=app.querySelector('[data-action="fullscreen"]');
function syncFullscreen(){fullscreenButton.textContent=document.fullscreenElement===app||app.classList.contains('is-immersive')?'↙ Exit fullscreen':'⛶ Enter fullscreen'}
fullscreenButton.addEventListener('click',async()=>{
 if(document.fullscreenElement===app){await document.exitFullscreen();return}
 if(app.classList.contains('is-immersive')){app.classList.remove('is-immersive');document.body.classList.remove('bp-immersed');syncFullscreen();return}
 try{if(!app.requestFullscreen)throw new Error('unsupported');await app.requestFullscreen()}catch(e){app.classList.add('is-immersive');document.body.classList.add('bp-immersed');syncFullscreen()}
});
document.addEventListener('fullscreenchange',syncFullscreen);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&app.classList.contains('is-immersive')){app.classList.remove('is-immersive');document.body.classList.remove('bp-immersed');syncFullscreen();fullscreenButton.focus()}});
function replaceProject(next, message) {
  cancel();
  checkpoint();
  project = next;
  save();
  render();
  projectStatus.textContent = message;
}

projectTitle.addEventListener('change', () => {
  const title = projectTitle.value.trim() || 'Untitled drawing';
  if (title === project.title) {
    projectTitle.value = title;
    return;
  }
  checkpoint();
  project.title = title;
  save();
  render(selected);
  projectStatus.textContent = '';
});

projectGuide.addEventListener('change', () => {
  checkpoint();
  project.guide = projectGuide.value;
  save();
  review();
  projectStatus.textContent = '';
});

app.querySelector('[data-action="new"]').addEventListener('click', () => {
  replaceProject(makeProject('Untitled drawing', 'custom'), 'Blank drawing ready. Undo restores the previous drawing.');
  viewTabs[0].click();
  projectTitle.focus();
  projectTitle.select();
});

const projectFile = app.querySelector('[data-project-file]');
app.querySelector('[data-action="open"]').addEventListener('click', () => projectFile.click());
projectFile.addEventListener('change', async () => {
  const file = projectFile.files[0];
  projectFile.value = '';
  if (!file) return;
  const previous = JSON.stringify(project);
  try {
    if (file.size > 5_000_000) throw new Error('Project too large');
    const next = readProject(JSON.parse(await file.text()));
    if (JSON.stringify(project) !== previous) {
      projectStatus.textContent = 'The drawing changed while the file was opening. Open the file again to replace it.';
      return;
    }
    replaceProject(next, 'Project opened. Undo restores the previous drawing.');
    viewTabs[0].click();
  } catch {
    projectStatus.textContent = 'Could not open that file. Choose a valid blueprint project JSON file under 5 MB.';
  }
});

function download(suffix, data, type) {
  const name = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'blueprint';
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name + suffix;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

app.querySelector('[data-action="save"]').addEventListener('click', () => {
  download('.blueprint.json', JSON.stringify(project, null, 2), 'application/json');
  projectStatus.textContent = 'Editable project downloaded.';
});

const exportStyles = `
  .draft-object { fill: none; stroke: #d8f7ff; stroke-width: 3 }
  .draft-hidden { stroke-dasharray: 9 7 }
  .draft-center { stroke-dasharray: 20 6 4 6; stroke-width: 1.5 }
  .draft-dimension { fill: none; stroke: #ffae42; stroke-width: 1.5; marker-start: url(#dimArrow); marker-end: url(#dimArrow) }
  .draft-dimension-text { fill: #ffae42; font: 14px monospace; paint-order: stroke; stroke: #073e70; stroke-width: 4 }
  #dimArrow path { fill: #ffae42 }
  .bp-sheet-view { fill: #d8f7ff; font: 16px monospace }
  .bp-title-block { fill: none; stroke: #d8f7ff }
  .bp-title-block text { fill: #d8f7ff; stroke: none; font: 12px monospace }
`;

function exportPanel(name, x, y, titleBlock) {
  const panel = el('svg', { x, y, width: 800, height: 500, viewBox: '0 0 800 500', overflow: 'hidden' });
  const label = el('text', { x: 24, y: 40, class: 'bp-sheet-view' });
  label.textContent = viewLabel(name);
  const shapes = el('g');
  shapes.append(...project.views[name].map(shapeNode));
  panel.append(
    el('rect', { width: 800, height: 500, fill: '#073e70' }),
    el('rect', { width: 800, height: 500, fill: 'url(#majorGrid)' }),
    shapes,
    label
  );
  if (titleBlock) panel.append(svg.querySelector('.bp-title-block').cloneNode(true));
  return panel;
}

function exportDrawing(allViews) {
  const width = allViews ? 1648 : 800;
  const height = allViews ? 1048 : 500;
  const output = el('svg', { width, height, viewBox: '0 0 ' + width + ' ' + height, color: '#d8f7ff' });
  const title = el('title');
  title.textContent = project.title + (allViews ? ' · Orthographic views' : ' · ' + viewLabel(view));
  const style = el('style');
  style.textContent = exportStyles;
  output.append(title, style, svg.querySelector('defs').cloneNode(true));
  if (allViews) {
    output.append(
      el('rect', { width, height, fill: '#052d52' }),
      exportPanel('top', 16, 16, false),
      exportPanel('front', 16, 532, false),
      exportPanel('right', 832, 532, false)
    );
    const heading = el('text', { x: 880, y: 180, fill: '#d8f7ff', 'font-family': 'monospace', 'font-size': 32 });
    heading.textContent = project.title;
    const details = el('text', { x: 880, y: 220, class: 'bp-sheet-view' });
    details.textContent = 'A-01 · THIRD-ANGLE VIEWS · DIMENSIONS IN MM';
    output.append(heading, details);
  } else {
    output.append(exportPanel(view, 0, 0, true));
  }
  download(allViews ? '-sheet.svg' : '-' + view + '-view.svg',
    new XMLSerializer().serializeToString(output), 'image/svg+xml');
  status.textContent = allViews ? 'Three-view SVG sheet downloaded.' : 'Current view SVG downloaded.';
}

async function dxfModule() {
  if (!modules.dxf) await loading;
  return modules.dxf;
}

app.querySelector('[data-action="export-dxf"]').addEventListener('click', async () => {
  try {
    const { toDxf } = await dxfModule();
    download('.dxf', toDxf(project), 'image/vnd.dxf');
    status.textContent = 'DXF downloaded: millimetres, three views laid out third-angle, layers OUTLINE, HIDDEN, CENTER and DIMENSIONS.';
  } catch {
    status.textContent = 'The DXF writer could not load. Check the connection and try again.';
  }
});

const dxfFile = app.querySelector('[data-dxf-file]');
app.querySelector('[data-action="import-dxf"]').addEventListener('click', () => dxfFile.click());
dxfFile.addEventListener('change', async () => {
  const file = dxfFile.files[0];
  dxfFile.value = '';
  if (!file) return;
  const previous = JSON.stringify(project);
  const into = view;
  try {
    if (file.size > 5_000_000) throw new Error('That DXF is over 5 MB. Export only the part you need.');
    const { fromDxf } = await dxfModule();
    const read = fromDxf(await file.text());
    if (JSON.stringify(project) !== previous) {
      projectStatus.textContent = 'The drawing changed while the file was opening. Import it again.';
      return;
    }
    const units = read.units.certain ? ' (' + read.units.name + ')' : '';
    const notes = read.notes.length ? ' ' + read.notes.join(' ') : '';
    if (read.views) {
      const next = readProject({ ...project, title: read.title || project.title, views: read.views });
      const count = Object.values(next.views).reduce((n, list) => n + list.length, 0);
      replaceProject(next, 'Imported ' + count + ' shapes into the front, top and right views' + units + '. Undo restores the previous drawing.' + notes);
      viewTabs[0].click();
    } else {
      const next = readProject({ ...project, views: { ...project.views, [into]: [...project.views[into], ...read.shapes] } });
      replaceProject(next, 'Imported ' + read.shapes.length + ' shapes into the ' + into + ' view' + units + '. Undo removes them.' + notes);
    }
  } catch (error) {
    projectStatus.textContent = error?.name === 'DxfError' || /DXF/.test(error?.message || '')
      ? error.message
      : 'Could not import that file. Choose an ASCII DXF drawing under 5 MB.';
  }
});

const buildStatus = app.querySelector('[data-build-status]');
app.querySelector('[data-action="build-workbench"]').addEventListener('click', async () => {
  // the lesson's own first check, then the sizes the three views share
  if (!viewsReady) {
    buildStatus.textContent = 'Not yet: Workbench needs object geometry in all three views (the first drafting check). Draw the front, top and right views first.';
    return;
  }
  if (!modules.dxf || !modules.handoff) {
    buildStatus.textContent = 'Getting ready…';
    try { await loading; } catch { buildStatus.textContent = 'The hand-off could not load. Check the connection and try again.'; return; }
  }
  const made = modules.dxf.workbenchSvg(project);
  if (made.error) {
    buildStatus.textContent = 'Not yet: ' + made.error;
    return;
  }
  const { width, depth, height } = made.size;
  try {
    await modules.handoff.sendAndOpen(new URL('../../../workbench.html', scriptUrl).href, {
      bytes: new TextEncoder().encode(made.svg),
      filename: made.filename,
      from: 'Blueprint Drafting'
    });
    buildStatus.textContent = 'Opened in Workbench: the top view’s outline (' + width + ' × ' + depth + ' mm) pulled up ' + height + ' mm, the front view’s height. Cut the pockets and slots there with Holes.' +
      (made.openLines ? ' ' + made.openLines + ' top-view line' + (made.openLines === 1 ? ' doesn’t' : 's don’t') + ' close a loop, so ' + (made.openLines === 1 ? 'it was' : 'they were') + ' left out.' : '');
  } catch (error) {
    buildStatus.textContent = error?.message || 'The model could not be passed to Workbench.';
  }
});

app.querySelector('[data-action="export"]').addEventListener('click', () => exportDrawing(false));
app.querySelector('[data-action="export-sheet"]').addEventListener('click', () => exportDrawing(true));
render();
}());
