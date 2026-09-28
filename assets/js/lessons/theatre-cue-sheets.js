(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const key = 'classroomos-theatre-cue-sheet-v1';
  const departments = ['Audio', 'Scene transition', 'Costume change', 'Lighting', 'Props', 'Projection / video', 'Other'];
  const fields = [
    ['id','Cue ID','SND 1'], ['department','Department',''], ['location','Script / score location','p. 12 / bar 32, beat 1'], ['owner','Operator / crew','Name or crew role'],
    ['standby','Standby trigger / self-cued','Previous line or action; or “self-cued”'], ['trigger','Exact GO / action trigger','On the word… / after the exit…'],
    ['action','Action / timing','Track name, fade time, shift route, costume…'], ['notes','Notes / next entrance deadline','Readiness, destination, next entrance…']
  ];
  const metaLabels = {production:'Production',student:'Student(s)',class:'Class / period',scene:'Scene / song / act',revision:'Revision / date',caller:'Cue caller'};
  const blank = () => Object.fromEntries(fields.map(([f]) => [f, f === 'department' ? 'Audio' : '']));
  let state = {version:1,meta:{},notes:'',cues:[blank(),blank(),blank(),blank()]};
  let storageOK = true;
  function valid(s) {
    return s && s.version === 1 && s.meta && typeof s.meta === 'object' && !Array.isArray(s.meta) &&
      Object.values(s.meta).every(v => typeof v === 'string' && v.length <= 20000) && typeof s.notes === 'string' && s.notes.length <= 20000 &&
      Array.isArray(s.cues) && s.cues.length <= 300 && s.cues.every(c => c && fields.every(([f]) => typeof c[f] === 'string' && c[f].length <= 20000));
  }
  try { const saved = JSON.parse(localStorage.getItem(key)); if (valid(saved)) state = saved; } catch { storageOK = false; }
  const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  function save(message) {
    $('review').textContent = '';
    try { localStorage.setItem(key,JSON.stringify(state)); storageOK = true; } catch { storageOK = false; }
    $('save-status').textContent = message || (storageOK ? 'Draft saved on this browser and device. Download a backup before moving computers or clearing browser data.' : 'This browser cannot save your draft. Download a backup before leaving.');
    if (!$('print-sheet').hidden) buildPrint();
  }
  function hydrate() {
    document.querySelectorAll('#metadata input').forEach(i => { i.value = state.meta[i.name] || ''; });
    $('sheet-notes').value = state.notes;
    render();
  }
  function render(focusIndex) {
    $('cue-rows').replaceChildren();
    $('empty').hidden = state.cues.length > 0;
    state.cues.forEach((cue,index) => {
      const section = node('section',undefined,'cue-row');
      section.setAttribute('aria-label',`Cue row ${index + 1}`);
      const head = node('div',undefined,'row-heading'); head.append(node('h3',`Cue row ${index + 1}`));
      function button(label, title, fn, disabled=false) { const b = node('button',label); b.type='button'; b.setAttribute('aria-label',title); b.disabled=disabled; b.addEventListener('click',fn); head.append(b); }
      button('↑',`Move cue row ${index+1} up`,() => { [state.cues[index-1],state.cues[index]] = [state.cues[index],state.cues[index-1]]; render(index-1); save(); },index===0);
      button('↓',`Move cue row ${index+1} down`,() => { [state.cues[index+1],state.cues[index]] = [state.cues[index],state.cues[index+1]]; render(index+1); save(); },index===state.cues.length-1);
      button('Duplicate',`Duplicate cue row ${index+1}`,() => { const copy={...cue,id:''}; state.cues.splice(index+1,0,copy); render(index+1); save('Cue duplicated with an empty ID. Assign a new unique ID.'); });
      button('Remove',`Remove cue row ${index+1}`,() => { if (fields.some(([f]) => f!=='department' && cue[f].trim()) && !window.confirm('Remove this cue? Download a backup first if you want to keep it.')) return; state.cues.splice(index,1); render(Math.min(index,state.cues.length-1)); save(); });
      section.append(head);
      const grid=node('div',undefined,'row-fields');
      fields.forEach(([f,label,placeholder],fi) => {
        const wrapper=node('label',label,fi>=4 ? 'wide' : '');
        const control=node(f==='department'?'select':fi>=4?'textarea':'input');
        control.setAttribute('aria-label',`${label}, cue row ${index+1}`); control.maxLength=20000;
        if(f==='department') {
          const options=departments.includes(cue.department)?departments:[...departments,cue.department];
          options.forEach(d => { const o=node('option',d); o.value=d; control.append(o); });
        } else { control.placeholder=placeholder; if(fi>=4) control.rows=2; }
        control.value=cue[f];
        control.addEventListener('input',() => { cue[f]=control.value; save(); });
        wrapper.append(control);
        if(f==='department') {
          const custom=node('input'); custom.placeholder='Name your department'; custom.setAttribute('aria-label',`Custom department, cue row ${index+1}`);
          custom.hidden=control.value!=='Other'; custom.maxLength=20000;
          custom.addEventListener('input',()=> { cue.department=custom.value || 'Other'; save(); });
          control.addEventListener('change',()=> { custom.hidden=control.value!=='Other'; if(!custom.hidden) custom.focus(); });
          wrapper.append(custom);
        }
        grid.append(wrapper);
      });
      section.append(grid); $('cue-rows').append(section);
    });
    if(focusIndex>=0) $('cue-rows').children[focusIndex]?.querySelector('input')?.focus();
  }
  function add() { state.cues.push(blank()); render(state.cues.length-1); save(); }
  $('add').addEventListener('click',add); $('add-bottom').addEventListener('click',add);
  document.querySelectorAll('#metadata input').forEach(i => i.addEventListener('input',()=> {state.meta[i.name]=i.value; save();}));
  $('sheet-notes').addEventListener('input',()=> { state.notes=$('sheet-notes').value; save(); });
  $('example').addEventListener('click',()=> {
    const examples = [
      ['SND 1','Audio','Act 1, scene 1, p. 2','Sound operator','On “Are you ready?”','On the word “begin”','Play track 01, “Market opening”; fade in over 2 seconds at rehearsed level.','Confirm track is loaded before standby.'],
      ['LX 1','Lighting','Act 1, scene 1, p. 2','Lighting operator','On “Are you ready?”','On the word “begin”','Fade to the market lighting look over 3 seconds.','Called with Sound 1 on the same GO.'],
      ['CST 1','Costume change','Act 1, scene 1, p. 4','Alex + dresser','Self-cued; preset apron before scene','When Alex exits stage right after the verse','At stage-right quick-change station: remove apron, put on coat.','Ready before next entrance at bar 48, beat 1.'],
      ['SCN 1','Scene transition','Act 1, scene 1, p. 5','Shift crew A + B','During final spoken line','After ensemble clears the marked shift route; caller gives GO','Move bench from center to its taped stage-left storage mark along rehearsed route.','Wait for crew readiness; teacher approves route in rehearsal.']
    ];
    const existing = new Set(state.cues.map(c=>c.id.toLowerCase()));
    const start=state.cues.length;
    examples.forEach(values=> { const c=Object.fromEntries(fields.map(([f],i)=>[f,values[i]])); if(existing.has(c.id.toLowerCase())) c.id=''; state.cues.push(c); });
    render(start); save('Practice examples appended. Adapt them to your musical and assign any missing cue IDs.');
  });
  function buildPrint() {
    const sheet=$('print-sheet'); sheet.replaceChildren(node('h2',state.meta.production || 'Theatre cue sheet'));
    const meta=node('div',undefined,'print-meta');
    Object.entries(metaLabels).filter(([f])=>f!=='production').forEach(([f,l])=> { const p=node('div'); p.append(node('strong',l+': '),node('span',state.meta[f]||'____________________')); meta.append(p); }); sheet.append(meta);
    const table=node('table'); table.append(node('caption','Cues in show order'));
    const colgroup=node('colgroup'); [7,10,11,13,15,20,10,14].forEach(w=> {const c=node('col');c.style.width=w+'%';colgroup.append(c);}); table.append(colgroup);
    // Keep identity, location, trigger, action, and owner together on paper.
    const order=['id','department','location','standby','trigger','action','owner','notes'];
    const thead=node('thead'), tr=node('tr'); order.forEach(f=> {const th=node('th',fields.find(a=>a[0]===f)[1]); th.scope='col';tr.append(th);}); thead.append(tr); table.append(thead);
    const tbody=node('tbody'); (state.cues.length?state.cues:[blank()]).forEach(c=> {const row=node('tr');order.forEach(f=>row.append(node('td',c[f]||'\u00a0')));tbody.append(row);}); table.append(tbody); sheet.append(table);
    sheet.append(node('h3','Production notes / rehearsal revisions'),node('div',state.notes||'\u00a0','print-notes'));
  }
  $('preview').addEventListener('click',()=> { buildPrint(); const show=$('print-sheet').hidden; $('print-sheet').hidden=!show; $('preview').setAttribute('aria-expanded',String(show)); $('preview').textContent=show?'Hide print preview':'Show print preview'; if(show) $('print-sheet').scrollIntoView({behavior:'instant',block:'start'}); });
  $('print').addEventListener('click',()=> {buildPrint();window.print();}); window.addEventListener('beforeprint',buildPrint);
  $('check').addEventListener('click',()=> {
    const issues=[]; const ids=new Set(); const active=state.cues.filter(c=>fields.some(([f])=>f!=='department' && c[f].trim()));
    if(!state.meta.student?.trim()) issues.push('Enter your student name.');
    if(!state.meta.production?.trim()) issues.push('Enter the production name.');
    if(!active.length) issues.push('Add at least one cue.');
    state.cues.forEach((c,i)=> { if(!active.includes(c)) return; const missing=['id','location','standby','trigger','action','owner'].filter(f=>!c[f].trim()); if(missing.length) issues.push(`Row ${i+1}: add ${missing.map(f=>fields.find(a=>a[0]===f)[1]).join(', ')}.`); const id=c.id.trim().toLowerCase(); if(id && ids.has(id)) issues.push(`Row ${i+1}: cue ID “${c.id}” is repeated.`); if(id) ids.add(id); });
    $('review').textContent=issues.length?issues.join(' '):'Required fields and unique IDs checked. Rehearse with a partner to confirm timing, readiness, and safe routes before turning in.';
  });
  $('download').addEventListener('click',()=> {const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='theatre-cue-sheet.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);save('Backup downloaded. Keep this file to reopen your sheet here.');});
  $('import').addEventListener('click',()=> $('backup-file').click());
  $('backup-file').addEventListener('change',async e=> {
    const file=e.target.files[0]; if(!file) return;
    try { if(file.size>4000000) throw Error(); const data=JSON.parse(await file.text()); if(!valid(data)) throw Error(); if(!window.confirm('Replace the current sheet with this backup?')) return; state={version:1,meta:data.meta,notes:data.notes,cues:data.cues.map(c=>Object.fromEntries(fields.map(([f])=>[f,c[f]])))}; hydrate();save('Backup opened and saved on this device.'); } catch { $('save-status').textContent='Could not open this file. Choose a JSON backup downloaded from this cue-sheet builder.'; } finally { e.target.value=''; }
  });
  $('clear').addEventListener('click',()=> {if(!window.confirm('Clear all names, notes, and cues? Download a backup first to keep this sheet.'))return;state={version:1,meta:{},notes:'',cues:[blank(),blank(),blank(),blank()]};hydrate();save('Sheet cleared. Start your next draft.');$('metadata').querySelector('input').focus();});
  hydrate(); buildPrint(); save();
})();
