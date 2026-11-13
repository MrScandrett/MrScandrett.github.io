const icons = {
  pen: '<path d="m5 17-1 4 4-1L20 8l-3-3Z"/><path d="m14 8 3 3M4 21h7"/>',
  select: '<path d="m6 3 13 10-7 1-3 7Z"/>',
  shapes: '<path d="m4 4 8 1-4 8Z"/><rect x="13" y="13" width="8" height="8" rx="1"/><circle cx="18" cy="6" r="4"/>',
  ink: '<path d="M3 17c4-12 5-12 5-3s3-5 5-5-1 10 3 8l5-4"/>',
  erase: '<path d="m4 13 9-9a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3l-9 9H8l-4-4a2 2 0 0 1 0-3Z"/><path d="m10 7 7 7M11 20h10"/>',
  air: '<path d="M8 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v8c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2"/>',
  undo: '<path d="M9 5 3 11l6 6M3 11h12a6 6 0 0 1 6 6v2"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  triangle: '<path d="m12 3 10 18H2Z"/>',
  cylinder: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 19c0-4 16-4 16 0"/>',
  cone: '<path d="m12 2 9 17c0 4-18 4-18 0Z"/><ellipse cx="12" cy="19" rx="9" ry="3"/>',
  sphere: '<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/>',
  prism: '<path d="m4 6 8-4 8 4v12l-8 4-8-4ZM4 6l8 4 8-4M12 10v12"/>',
  joint: '<path d="m12 2 7 7H5Zm-7 9h14v9c-4 3-10 3-14 0ZM5 15h14"/>',
  grid: '<path d="M8 3v18M16 3v18M3 8h18M3 16h18"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2 7M4 4v7h7"/>',
};
function icon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[name] || icons.shapes) + '</svg>'; }
function button(id, label, graphic) {
  const b = document.createElement('button'); b.type = 'button'; b.id = id;
  b.innerHTML = icon(graphic) + '<span>' + label + '</span>'; return b;
}
export function initBoardStudio(readState) {
  const app = document.getElementById('smart-blackboard-app');
  const $ = id => document.getElementById(id);
  const frame = app.querySelector('.bb-board-frame'), stage = $('stage-wrap');
  const dock = app.querySelector('.bb-toolbar'), inspector = app.querySelector('.bb-inspector');
  app.classList.add('bb-studio');
  const heading = document.createElement('div'); heading.className = 'bb-board-heading';
  heading.innerHTML = '<span class="bb-studio-mark" aria-hidden="true">' + icon('cube') + '</span><div><span class="bb-eyebrow">CLASSROOM BLACKBOARD</span><h1>Geometry studio</h1></div>';
  frame.append(heading);

  const shapeMenu = document.createElement('section'); shapeMenu.id = 'bb-shape-menu'; shapeMenu.className = 'bb-shape-menu'; shapeMenu.hidden = true;
  shapeMenu.setAttribute('aria-label', 'Choose a shape');
  shapeMenu.innerHTML = '<div class="bb-flyout-title"><strong>Shapes &amp; solids</strong><span>Tap to place on the board</span></div>';
  const shapeGrid = document.createElement('div'); shapeGrid.className = 'bb-shape-grid';
  const shapes = [['triangle','Triangle','triangle'],['circle','Circle','circle'],['3d-cube','Cube','cube'],['3d-cyl','Cylinder','cylinder'],['3d-cone','Cone','cone'],['3d-sphere','Sphere','sphere'],['3d-prism','Prism','prism'],['3d-conjoined','Composite','joint']];
  shapes.forEach(([id,label,graphic])=>{
    const b = $('btn-mode-'+id); b.innerHTML = icon(graphic) + '<span>'+label+'</span>';
    b.removeAttribute('style'); shapeGrid.append(b);
    b.addEventListener('click',()=>{setPointerTool('select'); closeShapes();});
  });
  shapeMenu.append(shapeGrid); frame.append(shapeMenu);

  const colors = document.createElement('div'); colors.className = 'bb-color-rail'; colors.setAttribute('role','group'); colors.setAttribute('aria-label','Chalk colours');
  app.querySelectorAll('.bb-color-dot').forEach(b=>colors.append(b)); frame.append(colors);
  const draw = $('btn-mode-draw'); draw.innerHTML = icon('pen') + '<span>Pen</span>'; draw.removeAttribute('style');
  const undo = $('btn-undo'); undo.innerHTML = icon('undo') + '<span>Undo</span>'; undo.removeAttribute('style');
  const air = $('btn-air-chalk'); air.innerHTML = icon('air') + '<span>Air Chalk</span>'; air.removeAttribute('style');
  const clear = $('btn-clear'); clear.innerHTML = 'Clear board';
  const select = button('bb-select-tool','Select','select');
  const shapesButton = button('bb-shapes-toggle','Shapes','shapes');
  shapesButton.setAttribute('aria-expanded','false'); shapesButton.setAttribute('aria-controls',shapeMenu.id);
  const ink = button('bb-ink-tool','Ink','ink'), erase = button('bb-eraser-tool','Eraser','erase');
  const controls = button('bb-controls-toggle','Controls','settings'); controls.setAttribute('aria-expanded','false'); controls.setAttribute('aria-controls','bb-studio-panel');
  dock.replaceChildren(select, draw, shapesButton, ink, erase, air, undo, controls);
  function setPointerTool(tool) {
    app.dataset.pointerTool = tool;
    [[select,'select'],[draw,'geometry'],[ink,'ink'],[erase,'erase']].forEach(([b,name])=>{b.classList.toggle('bb-dock-selected',tool===name);b.setAttribute('aria-pressed',String(tool===name));});
  }
  function pickTool(tool) {
    if(readState().mode.startsWith('3d')) draw.click();
    $('air-tool').value = tool==='select'?'geometry':tool;
    $('air-tool').dispatchEvent(new Event('change'));
    setPointerTool(tool); closeShapes();
  }
  select.addEventListener('click',()=>{setPointerTool('select');closeShapes();});
  draw.addEventListener('click',()=>pickTool('geometry'));
  // Avoid recursively clicking Pen when switching out of a 3D mode.
  ink.addEventListener('click',()=>pickTool('ink')); erase.addEventListener('click',()=>pickTool('erase'));
  $('air-tool').addEventListener('change',()=>setPointerTool($('air-tool').value==='laser'?'select':$('air-tool').value));
  shapesButton.addEventListener('click',()=>{shapeMenu.hidden=!shapeMenu.hidden;shapesButton.setAttribute('aria-expanded',String(!shapeMenu.hidden));});
  function closeShapes(){shapeMenu.hidden=true;shapesButton.setAttribute('aria-expanded','false');}

  inspector.id='bb-studio-panel'; inspector.hidden=true; inspector.setAttribute('aria-label','Board controls');
  const panelHeading=document.createElement('div');panelHeading.className='bb-panel-heading';
  panelHeading.innerHTML='<strong>Board controls</strong>';
  const close=button('bb-panel-close','Close controls','close');close.setAttribute('aria-label','Close controls');panelHeading.append(close);
  const tabs=document.createElement('div');tabs.className='bb-panel-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Control sections');
  const panes={};
  [['geometry','Geometry'],['air','Air Chalk'],['practice','Practice'],['board','Board']].forEach(([id,label])=>{
    const tab=document.createElement('button');tab.type='button';tab.textContent=label;tab.dataset.panel=id;tab.setAttribute('aria-pressed','false');tab.addEventListener('click',()=>openPanel(id));tabs.append(tab);
    const pane=document.createElement('div');pane.className='bb-panel-pane';pane.id='bb-pane-'+id;pane.hidden=true;panes[id]=pane;
  });
  const geometryNodes=[...inspector.children].filter(el=>!el.querySelector('#investigation-title')&&!el.querySelector('#air-tools-title')&&el.id!=='gesture-legend');
  const practice=$('investigation-title').closest('section'), airStudio=$('air-tools-title').closest('section');
  geometryNodes.forEach(el=>panes.geometry.append(el));
  panes.practice.append(practice);panes.air.append(airStudio,$('gesture-legend'));
  panes.board.append(app.querySelector('.bb-board-options'),clear);
  inspector.replaceChildren(panelHeading,tabs,...Object.values(panes));
  function openPanel(id='geometry') {
    inspector.hidden=false;app.classList.add('bb-panel-open');controls.setAttribute('aria-expanded','true');
    Object.entries(panes).forEach(([name,pane])=>pane.hidden=name!==id);
    tabs.querySelectorAll('button').forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.panel===id)));
    inspector.scrollTop=0;closeShapes();
  }
  function closePanel(){inspector.hidden=true;app.classList.remove('bb-panel-open');controls.setAttribute('aria-expanded','false');controls.focus({preventScroll:true});}
  controls.addEventListener('click',()=>inspector.hidden?openPanel():closePanel());close.addEventListener('click',closePanel);
  air.addEventListener('click',()=>openPanel('air'));

  const grid=button('bb-grid-toggle','Grid','grid');grid.className='bb-grid-toggle';grid.setAttribute('aria-pressed','false');frame.append(grid);
  grid.addEventListener('click',()=>{app.classList.toggle('bb-grid-visible');grid.setAttribute('aria-pressed',String(app.classList.contains('bb-grid-visible')));window.dispatchEvent(new Event('resize'));});
  const context=document.createElement('button');context.type='button';context.id='bb-object-controls';context.className='bb-object-controls';
  context.innerHTML=icon('settings')+'<span></span><span class="bb-context-action">Properties</span>';context.addEventListener('click',()=>openPanel('geometry'));stage.append(context);
  const formula=document.createElement('div');formula.className='bb-board-equation';formula.setAttribute('aria-hidden','true');stage.append(formula);
  const reset=button('bb-orbit-reset','Reset view','reset');reset.className='bb-orbit-reset';reset.hidden=true;reset.addEventListener('click',()=>$('bb-reset-view').click());stage.append(reset);
  const hint=document.createElement('div');hint.className='bb-board-hint';hint.textContent='Draw an idea. Make it precise.';frame.append(hint);
  // A single listener keeps the native camera lifecycle label in the compact dock.
  new MutationObserver(()=>{
    const active=air.getAttribute('aria-pressed')==='true';
    const label=air.disabled?'Starting…':active?'Air on':'Air Chalk';
    if(air.querySelector('span')?.textContent!==label || !air.querySelector('svg')) air.innerHTML=icon('air')+'<span>'+label+'</span>';
  }).observe(air,{childList:true,attributes:true,attributeFilter:['aria-pressed','disabled']});
  app.addEventListener('keydown',event=>{
    if(event.key==='Escape') {if(!shapeMenu.hidden){event.preventDefault();closeShapes();shapesButton.focus();}else if(!inspector.hidden){event.preventDefault();closePanel();}}
  });
  document.addEventListener('pointerdown',event=>{if(!shapeMenu.hidden&&!shapeMenu.contains(event.target)&&!shapesButton.contains(event.target))closeShapes();});
  setPointerTool('geometry');
  function refresh(){
    const state=readState(), three=state.mode.startsWith('3d');
    reset.hidden=!three;context.querySelector('span').textContent=three?({'3d-cube':'Cube','3d-cyl':'Cylinder','3d-cone':'Cone','3d-sphere':'Sphere','3d-prism':'Prism','3d-conjoined':'Composite solid'}[state.mode]):state.type==='circle'?'Circle':'Triangle';
    const rect=stage.getBoundingClientRect();
    const bounds=state.type==='circle'?{left:state.circle.cx-state.circle.r,right:state.circle.cx+state.circle.r,bottom:state.circle.cy+state.circle.r,top:state.circle.cy-state.circle.r}:{left:Math.min(...state.points.map(p=>p.x)),right:Math.max(...state.points.map(p=>p.x)),bottom:Math.max(...state.points.map(p=>p.y)),top:Math.min(...state.points.map(p=>p.y))};
    context.style.left=(three?rect.width*.38:Math.max(150,Math.min(rect.width-150,(bounds.left+bounds.right)/2)))+'px';
    context.style.top=(three?rect.height-175:Math.min(rect.height-150,bounds.bottom+44))+'px';
    formula.style.left=(three?Math.min(rect.width-290,rect.width*.72):Math.min(rect.width-280,bounds.right+90))+'px';
    formula.style.top=(three?100:Math.max(130,bounds.top+20))+'px';
    const equations={'3d-cube':['S = 6s²','Six faces. One surface.'],'3d-cyl':['S = 2πrh + 2πr²','Unroll the curved wall.'],'3d-cone':['L² = r² + h²','A sector becomes a cone.'],'3d-sphere':['x² + y² + z² = R²','A circle at every height.'],'3d-prism':['S = 2B + Ph','Follow the folded edges.'],'3d-conjoined':['S = S₁ + S₂ − 2A','The shared face is hidden.']};
    const eq=three?equations[state.mode]:state.type==='circle'?['A = πr²','C = 2πr']:['A = ½bh','∠A + ∠B + ∠C = 180°'];
    formula.replaceChildren();eq.forEach((text,i)=>{const line=document.createElement(i?'small':'span');line.textContent=text;formula.append(line);});
  }
  refresh();return {refresh,openPanel};
}
