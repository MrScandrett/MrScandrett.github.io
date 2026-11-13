/* Shared weekly assignments. Saved musical data, never screenshots or executable HTML. */
(() => {
  'use strict';
  function init() {
    const host = document.querySelector('[data-weekly-instrument]');
    if (!host) return;
    document.querySelector('main > [data-creation-app]')?.after(host);
    const instrument = host.dataset.weeklyInstrument;
    const name = instrument[0].toUpperCase() + instrument.slice(1);
    const key = 'weekly-practice-v1-' + instrument;
    const clone = value => JSON.parse(JSON.stringify(value));
    const id = () => crypto.randomUUID();
    const date = (offset = 0, from) => { let d = from ? new Date(from + 'T12:00:00') : new Date(); if (isNaN(d)) d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
    const make = () => ({ id:id(), student:'', week:date(), due:date(7), focus:'', minutes:10, days:4, note:'', large:false, counts:true, fingers:true, log:true, qr:true, practiceDays:[0,1,3,5], exercises:[] });
    const defaults = { success:'Three comfortable, accurate repetitions without stopping.', tempo:60, target:70, minutes:3, role:'Main skill', note:'', carry:true };
    let library = window.WeeklyPracticeLibraries?.[instrument] || [];
    if (instrument === 'guitar') library = [
      {title:'Chromatic ladder · two-string warm-up', focus:'Finger independence', instruction:'Start at fret 5. Play fingers 1–2–3–4 on strings 6 and 5. Pick down/up alternately. Release between attempts.', notes:Array.from({length:8},(_,i)=>({string:Math.floor(i/4),fret:5+i%4,finger:1+i%4})), source:'guitarTechnique'},
      {title:'Reverse ladder · two-string control', focus:'Finger independence', instruction:'Start with finger 4 at fret 8. Play 4–3–2–1 on strings 6 and 5. Keep the hand relaxed.', notes:Array.from({length:8},(_,i)=>({string:Math.floor(i/4),fret:8-i%4,finger:4-i%4})), source:'guitarTechnique'},
      {title:'String skipping', focus:'Picking & coordination', instruction:'Play frets 5–6–7–8 with fingers 1–2–3–4 on strings 6, 4, 2, 5, 3, then 1. Pick down/up alternately.',notes:[0,2,4,1,3,5].flatMap(string=>[1,2,3,4].map(finger=>({string,fret:4+finger,finger}))),source:'guitarTechnique'},
      {title:'Make a four-bar phrase', focus:'Musical application', instruction:'Choose two familiar chords. Play each for four steady beats, twice. Then sing or play a short answer using notes from your selected scale.',source:'progressions'}
    ];
    if (instrument === 'violin') library = [
      {title:'Open-string crossings', focus:'Bowing & tone', instruction:'Play G–D–G–D, D–A–D–A, A–E–A–E. Use separate bows. Change the bow level with a quiet arm motion.',violinNotes:['G','D','G','D','D','A','D','A','A','E','A','E'].map(string=>({name:string+({G:3,D:4,A:4,E:5}[string]),string,finger:'0'})),bowing:1,source:'violinTechnique'},
      {title:'D major · one octave', focus:'Scales & intonation', instruction:'Play one note per bow. Hear each note before placing the finger. Finger 2 is high on D and A strings.',violinNotes:['D4','E4','F#4','G4','A4','B4','C#5','D5','C#5','B4','A4','G4','F#4','E4','D4'].map((name,i)=>({name,string:i<4||i>10?'D':'A',finger:String([0,1,2,3,0,1,2,3,2,1,0,3,2,1,0][i])})),bowing:1,source:'violinTechnique'},
      {title:'D major · broken triad', focus:'Scales & intonation', instruction:'Play D–F♯–A–D–A–F♯–D with separate bows. Say root, third, fifth, octave; keep the tone even.',violinNotes:['D4','F#4','A4','D5','A4','F#4','D4'].map((name,i)=>({name,string:[0,1,5,6].includes(i)?'D':'A',finger:String([0,2,0,3,0,2,0][i])})),bowing:1,source:'violinTechnique'},
      {title:'Shape a musical answer', focus:'Musical application', instruction:'Choose four notes from a familiar scale. Play a short question, then a quieter answer. Mark where the phrase is going.',source:'violinTechnique'}
    ];
    library = library.map(e=>({...defaults,...e,group:e.group || 'Lesson studies'}));
    let state = {version:1,instrument,current:'',sheets:[make()]};
    let storageProblem = '';
    try { const saved = localStorage.getItem(key); if (saved) state = validate(JSON.parse(saved)); } catch { storageProblem = 'Saved assignments could not be read. You can still plan and export a backup.'; }
    if (!state.sheets.some(s=>s.id===state.current)) state.current=state.sheets[0].id;
    let selected = new Set([state.current]);
    function current() { return state.sheets.find(s=>s.id===state.current); }
    function save() { try { localStorage.setItem(key,JSON.stringify(state)); status.textContent='✓ Saved on this device'; } catch { status.textContent='This browser cannot save assignments. Export a backup before leaving.'; } }
    // Strictly reconstruct imports: no markup, URLs, or arbitrary object keys are rendered.
    function validate(data) {
      if (data?.version!==1 || data.instrument!==instrument || !Array.isArray(data.sheets) || !data.sheets.length || data.sheets.length>200) throw Error('Use a weekly practice backup for '+name+'.');
      const str=(v,n=1000)=>typeof v==='string'?v.slice(0,n):'';
      const num=(v,lo,hi,fallback)=>Number.isFinite(Number(v))?Math.min(hi,Math.max(lo,Number(v))):fallback;
      const sheets=data.sheets.map(raw=>{
        if (!Array.isArray(raw.exercises)||raw.exercises.length>40) throw Error('Each assignment can contain up to 40 exercises.');
        const s=make(); s.id=str(raw.id,80)||id();
        ['student','focus','note'].forEach(k=>s[k]=str(raw[k]));
        ['week','due'].forEach(k=>{if (/^\d{4}-\d{2}-\d{2}$/.test(raw[k]) && !isNaN(new Date(raw[k]+'T12:00:00'))) s[k]=raw[k];});
        s.minutes=num(raw.minutes,1,120,10);s.days=Math.round(num(raw.days,1,7,4));s.practiceDays=Array.isArray(raw.practiceDays)?[...new Set(raw.practiceDays.filter(n=>Number.isInteger(n)&&n>=0&&n<7))]:Array.from({length:s.days},(_,i)=>i);if(!s.practiceDays.length)s.practiceDays=[0];s.days=s.practiceDays.length;
        ['large','counts','fingers','log','qr'].forEach(k=>s[k]=typeof raw[k]==='boolean'?raw[k]:s[k]);
        s.exercises=raw.exercises.map(raw=>{
          const e={...defaults,id:id()};
          ['title','instruction','success','note','focus','group','role','sticking'].forEach(k=>{if(typeof raw[k]==='string')e[k]=str(raw[k]);});
          e.carry=raw.carry!==false;e.qrLessonOnly=raw.qrLessonOnly===true;
          e.tempo=num(raw.tempo,20,240,60);e.target=num(raw.target,20,240,70);e.minutes=num(raw.minutes,1,60,3);
          e.count=['quarter','eighth','sixteenth','auto'].includes(raw.count)?raw.count:'auto';
          e.root=num(raw.root,0,11,0);e.scaleKey=str(raw.scaleKey,40);e.diatonic=raw.diatonic===true;e.preferFlat=raw.preferFlat===true;
          e.bowing=[1,2,4].includes(raw.bowing)?raw.bowing:1;e.subdivision=raw.subdivision===2?2:1;
          if(raw.tracks) e.tracks=Object.fromEntries(['hat','snare','kick','tomHi','tomMid','tomLo','crash','ride','ohat'].filter(k=>/^[xXg-]{16,128}$/.test(raw.tracks[k])).map(k=>[k,raw.tracks[k]]));
          for(const k of ['grace','graceStick']) if(raw[k] && typeof raw[k]==='object') e[k]=Object.fromEntries(Object.entries(raw[k]).filter(([step,value])=>/^\d{1,3}$/.test(step) && (k==='grace'?[1,2].includes(value):/^[rl]{1,2}$/.test(value))));
          if(Array.isArray(raw.pitches))e.pitches=raw.pitches.slice(0,128).filter(p=>/^[A-G](?:#|b)?[0-8]$/.test(p));
          if(Array.isArray(raw.scaleNames)) e.scaleNames=raw.scaleNames.slice(0,16).map(n=>str(n,8));
          if(Array.isArray(raw.chordFrets))e.chordFrets=raw.chordFrets.slice(0,6).map(n=>typeof n==='number'?Math.round(num(n,0,24,0)):null);
          if(Array.isArray(raw.chordFingers))e.chordFingers=raw.chordFingers.slice(0,6).map(n=>typeof n==='number'?Math.round(num(n,0,4,0)):null);
          if(Array.isArray(raw.fingers))e.fingers=raw.fingers.slice(0,128).map(v=>str(String(v),4));
          if(Array.isArray(raw.notes))e.notes=raw.notes.slice(0,128).map(n=>({string:Math.round(num(n.string,0,5,0)),fret:Math.round(num(n.fret,0,24,0)),finger:Math.round(num(n.finger,0,4,1))}));
          if(Array.isArray(raw.violinNotes))e.violinNotes=raw.violinNotes.slice(0,128).map(n=>({name:str(n.name,12),string:str(n.string,2),finger:str(n.finger,12)}));
          e.source=/^[a-z][a-z0-9-]{0,60}$/i.test(raw.source)?raw.source:'';
          return e;
        });return s;
      });
      if(new Set(sheets.map(s=>s.id)).size!==sheets.length)throw Error('Backup contains duplicate assignment IDs.');
      return {version:1,instrument,current:str(data.current,80),sheets};
    }
    const el=(tag,text,parent,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;parent?.append(n);return n;};
    const button=(text,parent,fn,cls)=>{const b=el('button',text,parent,cls);b.type='button';b.onclick=fn;return b;};
    const field=(label,parent,value,change,type='text')=>{const l=el('label',label,parent);const n=el(type==='textarea'?'textarea':'input',null,l);if(type!=='textarea')n.type=type;n.value=value??'';n.addEventListener('input',()=>change(n.type==='number'?Number(n.value):n.value));return n;};
    const select=(label,parent,options,value,change)=>{const l=el('label',label,parent);const n=el('select',null,l);options.forEach(([v,t])=>n.add(new Option(t,v)));n.value=value;n.onchange=()=>change(n.value);return n;};
    const icons={drums:'◉',piano:'♬',guitar:'♫',violin:'𝄞'};
    const hero=el('header',null,host,'wp-hero');
    el('span',icons[instrument],hero,'wp-instrument-mark').setAttribute('aria-hidden','true');
    const intro=el('div',null,hero,'wp-intro');el('p',name+' · practice',intro,'wp-kicker');
    el('h2','Your practice week',intro).id='weeklyPracticeTitle';
    el('p','Choose a few things to play.',intro,'wp-lede');
    const actions=el('div',null,hero,'wp-hero-actions');
    button('Preview',actions,()=>{previewDialog.showModal();renderPreview();},'wp-secondary');
    const printOne=button('Print my week ↗',actions,()=>print([current()]),'wp-primary');printOne.setAttribute('aria-label','Print this assignment');
    const status=el('p',storageProblem||'Saved on this device',host,'wp-status');status.setAttribute('role','status');
    const layout=el('div',null,host,'wp-layout');const controls=el('div',null,layout,'wp-controls');
    const editor=el('div',null,controls,'wp-week-header');
    const routine=el('div',null,controls,'wp-routine');
    const exerciseEditor=el('div',null,controls,'wp-exercises');
    const footer=el('div',null,controls,'wp-week-actions');
    button('＋ Add activity',footer,()=>catalog.showModal(),'wp-secondary');
    button('Next week →',footer,()=>duplicate(false),'wp-text-button').setAttribute('aria-label','Copy to next week');

    function dialog(title,cls){
      const d=el('dialog',null,host,'wp-dialog '+cls);const head=el('header',null,d,'wp-dialog-head');
      const heading=el('h3',title,head);heading.id=cls+'-title';d.setAttribute('aria-labelledby',heading.id);
      button('×',head,()=>d.close(),'wp-close').setAttribute('aria-label','Close '+title.toLowerCase());
      d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();}});
      return d;
    }
    const catalog=dialog('Pick your activities','wp-library-dialog');
    const catalogActions=el('div',null,catalog,'wp-library-actions');
    button('✦ Make me a starter week',catalogActions,starter,'wp-primary').setAttribute('aria-label','Add a three-part starter');
    button('＋ Write my own',catalogActions,()=>{catalog.close();const e=add({title:'My activity',instruction:''});if(e)editExercise(e);},'wp-secondary').setAttribute('aria-label','Add my own exercise');
    const filters=el('div',null,catalog,'wp-filter-chips');filters.setAttribute('role','group');filters.setAttribute('aria-label','Choose a skill');
    let activeFilter='';
    const catalogList=el('div',null,catalog,'wp-library');
    const sources=el('details',null,catalog,'wp-sources');el('summary','Use something from the lesson',sources);
    button('Done choosing',catalog,()=>catalog.close(),'wp-primary wp-dialog-done');

    let editingId=null;
    const editDialog=dialog('Make it yours','wp-edit-dialog');editDialog.addEventListener('close',()=>{exerciseEditor.querySelector(`[data-exercise-id="${CSS.escape(editingId||'')}"] .wp-edit-button`)?.focus({preventScroll:true});});const editBody=el('div',null,editDialog,'wp-edit-body');
    button('Done',editDialog,()=>editDialog.close(),'wp-primary wp-dialog-done');
    const previewDialog=dialog('Your printout','wp-preview-dialog');
    const previewSide=el('section',null,previewDialog,'wp-preview-side');
    const pageCount=el('p','',previewSide,'wp-page-count');pageCount.setAttribute('role','status');
    const preview=el('div',null,previewSide,'wp-preview');
    const paperOptions=el('details',null,previewSide,'wp-paper-options');el('summary','Change the printout',paperOptions);
    const options=el('div',null,paperOptions,'wp-options');
    button('Print ↗',previewDialog,()=>print([current()]),'wp-primary wp-dialog-done');

    const batch=el('details',null,host,'wp-batch');el('summary','Saved weeks & more',batch);
    const toolbar=el('div',null,batch,'wp-toolbar');
    const picker=select('Open a saved week',toolbar,[],'',v=>{state.current=v;save();render();});picker.id='wpAssignment';
    button('New plan',toolbar,()=>{const s=make();state.sheets.push(s);state.current=s.id;selected.add(s.id);save();render();editor.querySelector('input').focus();}).setAttribute('aria-label','New student');
    button('Copy for someone else',toolbar,()=>duplicate(true)).setAttribute('aria-label','Copy to another student');
    const extra=el('div',null,batch,'wp-extra-fields');
    const roster=el('div',null,batch,'wp-roster');
    const printBatch=button('Print selected weeks',batch,()=>print(state.sheets.filter(s=>selected.has(s.id)&&s.exercises.length)));printBatch.setAttribute('aria-label','Print selected assignments');
    el('p','Plans stay on this device. Download a backup to keep them or move them.',batch,'wp-hint');
    button('Download backup',batch,()=>{
      const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=el('a',null,document.body);a.href=url;a.download=instrument+'-weekly-practice.json';a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }).setAttribute('aria-label','Export all assignments');
    const upload=el('input',null,batch);upload.type='file';upload.accept='.json,application/json';upload.hidden=true;
    button('Open backup',batch,()=>upload.click()).setAttribute('aria-label','Import assignments');
    upload.onchange=async()=>{try{if(!upload.files[0])return;if(upload.files[0].size>2000000)throw Error('Backup is too large.');const incoming=validate(JSON.parse(await upload.files[0].text()));incoming.sheets.forEach(s=>{s.id=id();state.sheets.push(s);});state.current=state.sheets.at(-1).id;save();render();status.textContent='Imported '+incoming.sheets.length+' saved weeks.';}catch(e){status.textContent='Import failed: '+e.message;}finally{upload.value='';}};
    button('Delete this week',batch,()=>{const removed=current();const index=state.sheets.indexOf(removed);state.sheets.splice(index,1);if(!state.sheets.length)state.sheets.push(make());state.current=state.sheets[0].id;selected.delete(removed.id);save();render();status.textContent='Week deleted. ';button('Undo',status,()=>{state.sheets.splice(index,0,removed);state.current=removed.id;save();render();});}).setAttribute('aria-label','Delete this assignment');
    const printRoot=el('div',null,document.body);printRoot.id='weeklyPracticePrint';
    function duplicate(other) {const s=clone(current());s.id=id();s.exercises=s.exercises.filter(e=>other||e.carry!==false);s.exercises.forEach(e=>e.id=id());if(other)s.student='';else{s.week=date(7,s.week);s.due=date(7,s.due);}state.sheets.push(s);state.current=s.id;selected.add(s.id);save();render();status.textContent=other?'Ready for a new name.':'Next week is ready.';if(other)editor.querySelector('input').focus();}
    function add(raw,role,redraw=true){if(current().exercises.length>=40){status.textContent='This week is full. Start another week to add more.';return;}const e={...defaults,...clone(raw),target:raw.target??Math.min(240,(Number(raw.tempo)||60)+10),id:id()};if(role)e.role=role;current().exercises.push(e);if(redraw){save();render();status.textContent='Added '+e.title+'.';}return e;}
    window.WeeklyPracticeAdd = add;
    if(window.getWeeklyPracticeList)button('My saved chords & scales',sources,()=>{const items=window.getWeeklyPracticeList();if(!items.length){status.textContent='Save a chord or scale in the lesson first.';return;}items.forEach(e=>add(e,undefined,false));save();render();catalog.close();}).setAttribute('aria-label','Add saved chord / scale practice list');
    function starter(){
      const matches=library.filter(e=>!activeFilter||e.focus===activeFilter);const first=matches[0];const second=matches.find(e=>e.focus!==first?.focus)||matches[1];const third=matches.find(e=>e.focus==='Musical application'&&e!==second&&e!==first)||matches.find(e=>e!==first&&e!==second);
      [first,second,third].filter(Boolean).forEach((e,i)=>add(e,['Warm-up','Main skill','Musical application'][i],false));save();render();catalog.close();status.textContent='Your starter week is ready. Change anything you like.';
    }
    function update(k,v){current()[k]=v;save();renderPicker();renderPreview();renderRoster();}
    function renderPicker(){picker.replaceChildren(...state.sheets.map(s=>new Option((s.student||'My practice')+' · '+s.week,s.id)));picker.value=state.current;}
    function renderCatalog(){
      filters.replaceChildren();[['','All'],...Array.from(new Set(library.map(e=>e.focus))).map(f=>[f,f])].forEach(([value,label])=>{const b=button(label,filters,()=>{activeFilter=value;renderCatalog();filters.querySelector('[aria-pressed=true]')?.focus({preventScroll:true});},'wp-chip');b.setAttribute('aria-pressed',String(activeFilter===value));});
      catalogList.replaceChildren();library.filter(e=>!activeFilter||e.focus===activeFilter).forEach(e=>{
        const card=el('article',null,catalogList,'wp-library-card');miniScore(card,e);
        el('small',e.group,card);el('h4',e.title,card);
        const count=current().exercises.filter(task=>task.title===e.title).length;
        button(count?'✓ Add another':'＋ Add',card,()=>{add(e);[...catalogList.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Add '+e.title)?.focus({preventScroll:true});},'wp-add-button').setAttribute('aria-label','Add '+e.title);
      });
    }
    function miniScore(parent,e){
      const visual=el('div',null,parent,'wp-mini-score');visual.setAttribute('aria-hidden','true');
      if(e.violinNotes?.length){e.violinNotes.slice(0,5).forEach(n=>el('span',n.name.replace(/\d/g,''),visual,'wp-note-token'));}
      else if(e.tracks||e.pitches?.length||e.notes?.length||e.chordFrets||e.scaleNames)score(visual,e,{counts:false,fingers:false},0,8);
      else{el('span','♫',visual,'wp-phrase-icon');el('span','Make some music',visual);}
    }
    function renderRoster(){roster.replaceChildren();state.sheets.forEach(s=>{const l=el('label',null,roster);const c=el('input',null,l);c.type='checkbox';c.checked=selected.has(s.id);c.disabled=!s.exercises.length;c.onchange=()=>{if(c.checked)selected.add(s.id);else selected.delete(s.id);refreshBatch();};l.append(document.createTextNode((s.student||'My practice')+' · '+s.week));});refreshBatch();}
    function refreshBatch(){printBatch.disabled=!state.sheets.some(s=>selected.has(s.id)&&s.exercises.length);}
    function renderRoutine(){
      routine.replaceChildren();const time=el('div',null,routine,'wp-time');el('span','A little time',time,'wp-routine-label');
      const timeChoices=el('div',null,time,'wp-segments');timeChoices.setAttribute('role','group');timeChoices.setAttribute('aria-label','Minutes per practice');
      [...new Set([5,10,15,20,current().minutes])].sort((a,b)=>a-b).forEach(n=>{const b=button(n+' min',timeChoices,()=>{update('minutes',n);renderRoutine();[...routine.querySelectorAll('.wp-time button')].find(b=>b.textContent===n+' min')?.focus({preventScroll:true});},'wp-chip');b.setAttribute('aria-pressed',String(n===current().minutes));});
      const days=el('div',null,routine,'wp-days');el('span','A few days',days,'wp-routine-label');const dayButtons=el('div',null,days,'wp-day-buttons');
      const planned=current().practiceDays||Array.from({length:current().days},(_,i)=>i);
      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((day,i)=>{const b=button(day[0],dayButtons,()=>{const next=planned.includes(i)?planned.filter(d=>d!==i):[...planned,i];if(!next.length){status.textContent='Pick at least one practice day.';return;}current().practiceDays=next.sort();current().days=next.length;save();renderRoutine();renderPreview();routine.querySelectorAll('.wp-day')[i]?.focus({preventScroll:true});},'wp-day');b.setAttribute('aria-label','Practice on '+['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]);b.setAttribute('aria-pressed',String(planned.includes(i)));el('small',day, b,'wp-day-name');});
    }
    function render(){
      renderPicker();editor.replaceChildren();
      const identity=el('div',null,editor,'wp-identity');const student=field('Made for',identity,current().student,v=>update('student',v));student.maxLength=80;student.placeholder='Your name';student.setAttribute('aria-label','Student name');
      field('Week of',identity,current().week,v=>update('week',v),'date');
      const focus=field('My small goal',editor,current().focus,v=>update('focus',v));focus.placeholder='What would you like to get better at?';focus.setAttribute('aria-label','This week’s focus');
      renderRoutine();renderCards();
      extra.replaceChildren();field('Next lesson / due',extra,current().due,v=>update('due',v),'date');field('A note for this week',extra,current().note,v=>update('note',v),'textarea').maxLength=1000;
      options.replaceChildren();[['large','Bigger music'],['counts','Counting'],['fingers','Finger & bow hints'],['log','Practice tracker'],['qr','Scan-to-open links']].forEach(([k,label])=>{const l=el('label',null,options);const c=el('input',null,l);c.type='checkbox';c.checked=current()[k];c.setAttribute('aria-label',k==='large'?'Large notation':label);c.onchange=()=>update(k,c.checked);l.append(document.createTextNode(label));});
      renderCatalog();renderPreview();renderRoster();
    }
    function renderCards(){
      exerciseEditor.replaceChildren();
      const heading=el('div',null,exerciseEditor,'wp-board-heading');el('h3','On the music stand',heading);el('span',current().exercises.length?current().exercises.length+' activities':'Let’s get started',heading);
      if(!current().exercises.length){
        const empty=el('div',null,exerciseEditor,'wp-empty');el('div','♪  ♫  ♪',empty,'wp-empty-notes').setAttribute('aria-hidden','true');el('h4','What will you play this week?',empty);el('p','Start with a ready-made week, or pick your own activities.',empty);
        const choices=el('div',null,empty,'wp-empty-choices');button('✦ Make me a starter week',choices,starter,'wp-primary').setAttribute('aria-label','Add a three-part starter');button('Choose my activities →',choices,()=>catalog.showModal(),'wp-secondary');
      }
      current().exercises.forEach((e,i)=>{
        const box=el('article',null,exerciseEditor,'wp-exercise-edit');box.dataset.role=e.role;box.dataset.exerciseId=e.id;
        const top=el('div',null,box,'wp-task-top');el('span',String(i+1).padStart(2,'0'),top,'wp-task-number');el('span',({'Warm-up':'Warm up','Main skill':'Build a skill','Musical application':'Make music'}[e.role]||e.role),top,'wp-task-role');
        const tools=el('div',null,top,'wp-task-tools');
        const move=delta=>{const list=current().exercises;[list[i],list[i+delta]]=[list[i+delta],list[i]];save();render();exerciseEditor.querySelectorAll('.wp-exercise-edit')[i+delta]?.querySelector('.wp-edit-button')?.focus({preventScroll:true});};
        button('↑',tools,()=>move(-1)).disabled=i===0;tools.lastChild.setAttribute('aria-label','Move up');button('↓',tools,()=>move(1)).disabled=i===current().exercises.length-1;tools.lastChild.setAttribute('aria-label','Move down');
        button('×',tools,()=>{current().exercises.splice(i,1);save();render();status.textContent='Activity removed. ';button('Undo',status,()=>{current().exercises.splice(i,0,e);save();render();});}).setAttribute('aria-label','Remove');
        const body=el('div',null,box,'wp-task-body');miniScore(body,e);const copy=el('div',null,body,'wp-task-copy');el('h4',e.title,copy);
        const how=el('details',null,copy,'wp-how');el('summary','How to play',how);el('p',e.instruction||'Add your practice notes with the pencil button.',how);if(e.success)el('p','Aim for: '+e.success,how);if(e.note)el('p',e.note,how);
        const metrics=el('div',null,box,'wp-task-metrics');
        const minutes=field('min',metrics,e.minutes,v=>{e.minutes=Math.max(1,Math.min(60,v));save();renderPreview();},'number');minutes.min=1;minutes.max=60;minutes.setAttribute('aria-label','Minutes for '+e.title);
        const tempo=field(instrument==='violin'?'notes/min':'beats/min',metrics,e.tempo,v=>{e.tempo=Math.max(20,Math.min(240,v));save();renderPreview();},'number');tempo.min=20;tempo.max=240;tempo.setAttribute('aria-label','Starting speed for '+e.title);
        button('✎ Make it yours',metrics,()=>editExercise(e),'wp-edit-button').setAttribute('aria-label','Edit '+e.title);
      });
    }
    function editExercise(e){
      editingId=e.id;
      editBody.replaceChildren();el('p',e.title,editBody,'wp-edit-title');const change=(k,v)=>{e[k]=v;save();renderCards();renderPreview();};
      field('Exercise title',editBody,e.title,v=>change('title',v)).maxLength=160;
      select('Practice slot',editBody,['Warm-up','Main skill','Musical application'].map(x=>[x,x]),e.role,v=>change('role',v));
      field('How to practice',editBody,e.instruction,v=>change('instruction',v),'textarea').maxLength=1500;
      const metrics=el('div',null,editBody,'wp-fields');[['tempo','Start BPM'],['target','Target BPM'],['minutes','Minutes']].forEach(([k,label])=>{const input=field(instrument==='violin'&&k!=='minutes'?label.replace('BPM','notes/min'):label,metrics,e[k],v=>change(k,Math.max(k==='minutes'?1:20,Math.min(k==='minutes'?60:240,v))),'number');input.min=k==='minutes'?1:20;input.max=k==='minutes'?60:240;});
      if(e.tracks)select('Count line',editBody,[['auto','Auto'],['quarter','Quarter notes'],['eighth','Eighth notes'],['sixteenth','Sixteenth notes']],e.count||'auto',v=>change('count',v));
      field('Ready for next lesson when…',editBody,e.success,v=>change('success',v),'textarea').maxLength=1000;
      field('Note for this exercise',editBody,e.note,v=>change('note',v),'textarea').maxLength=1000;
      const l=el('label',null,editBody,'wp-carry');const c=el('input',null,l);c.type='checkbox';c.checked=e.carry!==false;c.onchange=()=>change('carry',c.checked);l.append(document.createTextNode('Carry this exercise into next week'));
      editDialog.showModal();
    }
    function exactGroove(e){return e.tracks&&!e.qrLessonOnly&&!Object.keys(e.grace||{}).length&&Object.values(e.tracks).every(t=>t.length===16);}
    function lessonUrl(e){const url=new URL(location.href);url.search='';url.hash=exactGroove(e)&&window.GrooveSheetCore?window.GrooveSheetCore.hashFor({tracks:e.tracks,tempo:e.tempo}):(e.source||({drums:'build',piano:'piano-worksheets',guitar:'guitarTechnique',violin:'violinTechnique'}[instrument]));if(['localhost','127.0.0.1',''].includes(location.hostname)){url.protocol='https:';url.host='mrscandrett.github.io';}return url.href;}
    function table(parent,rows){const t=el('table',null,parent);rows.forEach(row=>{const tr=el('tr',null,t);row.forEach((text,i)=>{const c=el(i?'td':'th',text,tr);if(!i)c.scope='row';});});}
    function score(parent,e,s,start,end){
      if(e.tracks&&window.DrumLab){const staff=window.DrumLab.renderStaff({name:e.title,tracks:e.tracks,count:e.count||'auto',sticking:s.fingers?e.sticking:undefined,grace:e.grace,graceStick:s.fingers?e.graceStick:undefined},{crop:true}).svg;if(!s.counts)staff.querySelectorAll('.dr-count-lab').forEach(n=>n.remove());parent.append(staff);}
      if(e.pitches?.length&&window.PianoTheory){const pitches=e.pitches.slice(start,end);const staff=el('div',null,parent,'wp-piano-score');window.PianoTheory.renderStaff(staff,pitches.map(spelling=>({absIndex:window.MusicNotation.parsePitch(spelling).midi-60,spelling,dur:1})),{showLabels:false,cellWidth:48});table(parent,[...(s.counts?[['Count',...pitches.map((_,i)=>String((start+i)%4+1))]]:[]),['Note',...pitches],...(s.fingers?[['Finger',...(e.fingers||[]).slice(start,end)]]:[])]);}
      if(e.notes?.length&&window.GuitarScore){const staff=el('div',null,parent,'wp-guitar-score');window.GuitarScore.render(staff,e.notes.slice(start,end),{title:e.title,printCompact:true,subdivision:e.subdivision||1,root:e.diatonic?e.root:null,scale:e.diatonic?window.GuitarTheory.SCALE_TYPES.find(scale=>scale.key===e.scaleKey):null,preferFlat:e.preferFlat});staff._guitarScoreObserver?.disconnect();staff.querySelectorAll('[tabindex], [role="button"]').forEach(n=>{n.removeAttribute('tabindex');n.removeAttribute('role');n.removeAttribute('aria-pressed');});if(!s.counts)staff.querySelectorAll('.gs-count').forEach(n=>n.remove());if(!s.fingers)staff.querySelectorAll('.gs-finger,.gs-pick').forEach(n=>n.remove());}
      if(e.chordFrets) table(parent,[['String','6 · E','5 · A','4 · D','3 · G','2 · B','1 · E'],['Fret',...e.chordFrets.map(n=>n===null||n==='x'?'X':String(n))],...(s.fingers?[['Finger',...(e.chordFingers||[]).map(n=>n==null?'–':String(n))]]:[])]);
      if(e.scaleNames)table(parent,[['Scale notes',...e.scaleNames]]);
      if(e.violinNotes?.length){const notes=e.violinNotes.slice(start,end);table(parent,[['Note',...notes.map(n=>n.name)],['String',...notes.map(n=>n.string)],...(s.fingers?[['Finger',...notes.map(n=>n.finger)],['Bow',...notes.map((_,i)=>((Math.floor((start+i)/(e.bowing||1))%2?'↑':'↓')+' '+(Math.floor((start+i)/(e.bowing||1))+1)))]]:[]),...(s.counts?[['Count',...notes.map((_,i)=>String((start+i)%4+1))]]:[])]);el('small','One note per pulse. Bow arrows and numbers show bow groups. Finger 0 = open string.',parent);}
    }
    function header(page,s){el('p',name.toUpperCase()+' · WEEKLY PRACTICE',page,'wp-paper-kicker');el('h2',s.student||'Name ____________________',page);el('p',`Week of ${s.week} · Next lesson ${s.due}`,page);el('p',`Focus: ${s.focus||'________________________________'} · ${s.minutes} minutes · ${s.practiceDays?.map(i=>['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]).join(', ')||s.days+' days'}`,page);if(s.note)el('p',s.note,page);}
    function buildPages(s,container){
      const pages=[];let page;
      function newPage(){page=el('article',null,container,'wp-paper'+(s.large?' wp-paper-large':''));header(page,s);pages.push(page);return page;}
      newPage();
      function append(block){page.append(block);if(page.scrollHeight>page.clientHeight+1&&page.children.length>5){block.remove();newPage().append(block);} }
      s.exercises.forEach((e,index)=>{
        const len=e.pitches?.length||e.notes?.length||e.violinNotes?.length||1;
        const chunk=8;
        for(let start=0;start<len;start+=chunk){
          const block=el('section',null,null,'wp-paper-exercise');el('h3',`${index+1}. ${e.role}: ${e.title}`+(start?' (continued)':''),block);
          if(!start){el('p',e.instruction,block);el('p',`Start ${e.tempo} → Target ${e.target} ${instrument==='violin'?'notes/min':'BPM'} · ${e.minutes} min`,block);}
          // Attach for score renderers that measure their container.
          page.append(block);score(block,e,s,start,start+chunk);block.remove();
          if(start+chunk>=len){if(e.note)el('p',e.note,block);el('p','Ready when: '+e.success,block);el('p','Clean repeats: □ □ □   Achieved tempo: ______',block);
            if(s.qr&&window.QR){const link=el('a',exactGroove(e)?'Open this groove':'Open lesson',block);link.href=lessonUrl(e);link.className='wp-qr-link';try{const qr=el('span',null,link,'wp-qr');qr.innerHTML=window.QR.toSvg(window.QR.encode(link.href,'M'),{border:2,label:exactGroove(e)?'Scan to hear this groove':'Scan to open lesson'});}catch{/* The text link remains usable. */}}
          }
          append(block);
        }
      });
      const foot=el('section',null,null,'wp-paper-log');if(s.log){el('h3','This week’s practice log',foot);table(foot,[['Day','1','2','3','4','5','6','7'],['Minutes','','','','','','',''],['Tempo','','','','','','','']]);}el('p','What improved? __________________________________________________',foot);el('p','Next small step: __________________________________________________',foot);append(foot);
      pages.forEach((p,i)=>el('span',`${i+1} / ${pages.length}`,p,'wp-page-number'));return pages;
    }
    function renderPreview(){preview.style.setProperty('--wp-preview-scale',String(Math.min(1,Math.max(.3,(preview.clientWidth-18)/(7.1*96)))));preview.replaceChildren();const s=current();printOne.disabled=!s.exercises.length;if(!s.exercises.length){pageCount.textContent='Pick an activity to see your printout.';return;}const pages=buildPages(s,preview);pageCount.textContent=`${pages.length} ${pages.length===1?'page':'pages'} · Fits Letter & A4`;}
    function print(sheets){if(!sheets.length)return;printRoot.replaceChildren();sheets.forEach(s=>buildPages(s,printRoot));window.AudioKit?.stopAll();document.body.classList.add('wp-printing');try{window.print();}finally{document.body.classList.remove('wp-printing');printRoot.replaceChildren();}}
    // Existing lesson exercises stay where teachers already use them.
    if(['guitar','violin'].includes(instrument)){
      const activity=document.getElementById(instrument==='guitar'?'guitarTechnique':'violinTechnique');
      if(activity){const row=el('div',null,activity,'wp-add-current');button('Add current exercise to weekly assignment',row,()=>{if(window.getWeeklyTechnique)add(window.getWeeklyTechnique());});el('a','Go to weekly planner ↑',row).href='#weekly-practice';}
    }
    if(instrument==='drums'){
      button('My drum homework sheet',sources,()=>{let storage;try{storage=localStorage;}catch{}const saved=window.GrooveSheetCore.createStore(storage).sheet();if(!saved.patterns.length){status.textContent='The current drum homework sheet is empty.';return;}if(!current().student)current().student=saved.student;saved.patterns.forEach(p=>add({...p,instruction:p.note||'Count aloud, then combine the parts.',target:p.ladder?.at(-1)||p.tempo,source:'build'},undefined,false));save();render();});
      document.querySelectorAll('.dr-player').forEach(player=>{button('Add selected pattern to weekly assignment',player,()=>{
        // The live player publishes its current pattern through its adapter.
        const data=player.getWeeklyPattern?.();if(data)add(data);else status.textContent='Choose a pattern in the player first.';
      });});
    }
    document.addEventListener('click',event=>{if(event.target.closest('.wp-entry')){window.LessonLayout?.openPanel(false);requestAnimationFrame(()=>host.scrollIntoView({block:'start',behavior:'instant'}));}},true);
    render();
    // Keep the paper measurement accurate after web fonts finish loading.
    document.fonts?.ready.then(renderPreview);
    let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(renderPreview,100);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
