/* Personal, device-local dashboard arrangement. Never changes widget internals. */
(() => {
  'use strict';
  const panel = document.querySelector('#tabpanel-today');
  if (!panel) return;
  const grids = [...panel.querySelectorAll('.today-grid')];
  const cards = grids.flatMap(grid => [...grid.children].filter(el => el.classList.contains('home-widget')));
  const key = 'steam-home-widgets-v1';
  const defaults = cards.map((card, index) => ({
    id: card.id || [...card.classList].find(c => c.startsWith('home-widget--')) || `widget-${index}`,
    area: grids.indexOf(card.parentElement), size: card.matches('#home-calendar, #home-puzzles, .home-widget--apod') ? 'wide' : 'standard'
  }));
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch {}
  const state = defaults.map(item => {
    const match = Array.isArray(saved) && saved.find(s => s && s.id === item.id);
    return match ? { ...item, area: match.area === 1 ? 1 : 0, size: ['compact','standard','wide'].includes(match.size) ? match.size : item.size } : {...item};
  });
  if (Array.isArray(saved)) state.sort((a,b) => {
    const rank = id => { const i = saved.findIndex(s => s && s.id === id); return i < 0 ? saved.length : i; };
    return rank(a.id) - rank(b.id);
  });
  const byId = new Map(defaults.map((item,i) => [item.id, cards[i]]));
  const toolbar = document.createElement('div'); toolbar.className = 'widget-layout-toolbar';
  const toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = 'Customize widgets'; toggle.setAttribute('aria-pressed','false');
  const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Reset layout'; reset.hidden = true;
  const hint = document.createElement('p'); hint.textContent = 'Drag a handle or use the arrows. Choose a size and keep favorites in Today. Saved on this device.'; hint.hidden = true;
  const status = document.createElement('span'); status.className = 'widget-layout-status'; status.setAttribute('role','status');
  toolbar.append(toggle,reset,hint,status); grids[0].before(toolbar);
  function persist() { try { localStorage.setItem(key,JSON.stringify(state)); status.textContent = 'Layout saved'; } catch { status.textContent = 'Layout changed; storage is unavailable on this device.'; } }
  function render() {
    for (const item of state) { const card = byId.get(item.id); card.dataset.widgetSize = item.size; grids[item.area].append(card); }
    for (const item of state) {
      const peers = state.filter(s => s.area === item.area); const card = byId.get(item.id);
      card.querySelector('[data-move="-1"]').disabled = peers[0] === item;
      card.querySelector('[data-move="1"]').disabled = peers.at(-1) === item;
    }
    window.dispatchEvent(new Event('resize'));
  }
  let editing = false, dragged = null;
  toggle.addEventListener('click', () => {
    editing = !editing; panel.classList.toggle('widgets-editing',editing);
    toggle.textContent = editing ? 'Done' : 'Customize widgets'; toggle.setAttribute('aria-pressed',String(editing));
    reset.hidden = hint.hidden = !editing;
    if (editing) panel.querySelector('.today-more').open = true;
  });
  reset.addEventListener('click', () => {
    state.splice(0,state.length,...defaults.map(d=>({...d})));
    state.forEach(item => { const card=byId.get(item.id); card.querySelector('[data-size]').value=item.size; card.querySelector('[data-area]').value=String(item.area); });
    render(); persist();
  });
  const dialog = document.createElement('dialog'); dialog.className='widget-expanded'; panel.append(dialog);
  const close = document.createElement('button'); close.type='button'; close.className='widget-expanded-close'; close.textContent='Close expanded widget'; dialog.append(close);
  let expanded, marker, opener;
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{ if (!expanded) return; marker.replaceWith(expanded); expanded.classList.remove('widget-is-expanded'); expanded=null; opener.focus(); window.dispatchEvent(new Event('resize')); });
  cards.forEach(card => {
    const id = defaults[cards.indexOf(card)].id;
    const item = () => state.find(s=>s.id===id);
    const name = card.getAttribute('aria-label') || card.querySelector('h2,h3')?.textContent.trim() || 'Widget';
    const bar=document.createElement('div'); bar.className='widget-card-controls';
    const handle=document.createElement('button'); handle.type='button'; handle.className='widget-edit-control widget-drag-handle'; handle.textContent='⠿'; handle.draggable=true; handle.setAttribute('aria-label',`Drag ${name}; or use move buttons`);
    handle.addEventListener('dragstart',e=>{ dragged=id; e.dataTransfer.setData('text/plain',id); e.dataTransfer.effectAllowed='move'; });
    handle.addEventListener('dragend',()=>{dragged=null; panel.querySelectorAll('.widget-drop-target').forEach(c=>c.classList.remove('widget-drop-target'));});
    card.addEventListener('dragover',e=>{if(editing && dragged && dragged!==id){e.preventDefault(); card.classList.add('widget-drop-target');}});
    card.addEventListener('dragleave',()=>card.classList.remove('widget-drop-target'));
    card.addEventListener('drop',e=>{
      if(!editing || !dragged || dragged===id) return; e.preventDefault(); card.classList.remove('widget-drop-target');
      const source=state.find(s=>s.id===dragged); source.area=item().area;
      state.splice(state.indexOf(source),1); state.splice(state.indexOf(item()),0,source);
      byId.get(source.id).querySelector('[data-area]').value=String(source.area); render(); persist();
    });
    bar.append(handle);
    [-1,1].forEach(direction=>{
      const button=document.createElement('button'); button.type='button'; button.className='widget-edit-control'; button.dataset.move=direction;
      button.textContent=direction===-1?'↑':'↓'; button.setAttribute('aria-label',`Move ${name} ${direction===-1?'earlier':'later'}`);
      button.addEventListener('click',()=>{
        const peers=state.filter(s=>s.area===item().area); const other=peers[peers.indexOf(item())+direction]; if(!other)return;
        const a=state.indexOf(item()),b=state.indexOf(other); [state[a],state[b]]=[state[b],state[a]]; render(); persist(); button.focus();
      }); bar.append(button);
    });
    function selectControl(label,attribute,options,value,onChange) {
      const wrapper=document.createElement('label'); wrapper.className='widget-edit-control'; wrapper.append(`${label} `);
      const select=document.createElement('select'); select.setAttribute(attribute,''); select.setAttribute('aria-label',`${name} ${label.toLowerCase()}`);
      options.forEach(([value,text])=>select.add(new Option(text,value))); select.value=value;
      select.addEventListener('change',()=>{onChange(select.value);render();persist();}); wrapper.append(select);bar.append(wrapper);
    }
    selectControl('Size','data-size',[['compact','Compact'],['standard','Standard'],['wide','Wide']],item().size,value=>item().size=value);
    selectControl('Location','data-area',[['0','Today'],['1','Also today']],String(item().area),value=>item().area=Number(value));
    const expand=document.createElement('button'); expand.type='button'; expand.className='widget-expand'; expand.textContent='⛶'; expand.title='Expand widget'; expand.setAttribute('aria-label',`Expand ${name}`);
    expand.addEventListener('click',()=>{dialog.setAttribute('aria-label',name);opener=expand;expanded=card;marker=document.createComment('expanded widget');card.replaceWith(marker);card.classList.add('widget-is-expanded');dialog.append(card);dialog.showModal();window.dispatchEvent(new Event('resize'));});
    bar.append(expand);card.prepend(bar);
  });
  render();
})();
