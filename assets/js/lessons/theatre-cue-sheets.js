(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const key = 'classroomos-theatre-cue-sheet-v1';
  const departments = ['Audio', 'Lighting', 'Fly rail', 'Scene transition', 'Costume change', 'Props', 'Projection / video', 'Wireless mic', 'Other'];
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
  $('pirates-cues')?.addEventListener('click',()=> {
    if(state.cues.some(c=>fields.some(([f])=>f!=='department'&&c[f].trim())) && !window.confirm('Replace current cues with The Pirates of Penzance Act I opening cues?')) return;
    state.meta.production = 'The Pirates of Penzance';
    state.meta.scene = 'Act I Opening — Rocky Seashore on the Coast of Cornwall';
    state.notes = 'Booth cues to conductor for Overture and FLY 1 + LX 2. Add a seventh cue (e.g., LX 4 or LX 3.5) for the end of Ruth’s song to restore the full beach wash.';
    const pirates = [
      ['LX 1','Lighting','Pre-show / Overture','Lighting op','House manager gives clearance','Conductor reaches the podium','House lights out over 5 s; pit lights stay on.','Confirm conductor is in the pit before calling GO.'],
      ['FLY 1','Fly rail','Overture, final 8 bars','Fly crew','8 bars before the end of the overture','Cutoff of the final chord (with LX 2)','Main curtain out on a 4-count to its high mark.','Called together with LX 2 on a single GO.'],
      ['LX 2','Lighting','Overture, final chord','Lighting op','With FLY 1 (8 bars before end of overture)','Same GO as FLY 1 (cutoff of final chord)','Rocky-shore daylight look over 4 s.','Verify pirate chorus is in discovered positions.'],
      ['SND 1','Audio','Act I, Opening Chorus','Sound op','During the opening chorus','Pirate King steps through the R.C. arch','Unmute ch. 7 (Pirate King) at the rehearsed level.','Keep R.C. arch entrance route clear (see Stage Plot).'],
      ['SND 2','Audio','Act I, after Samuel’s line','Sound op','Samuel: “An error? What error?”','Ruth rises and comes forward','Unmute ch. 4 (Ruth) one line before she speaks.','Check hairline mic for costume rustle.'],
      ['LX 3','Lighting','Act I, before Ruth’s song','Lighting op','Ruth: “…cankering tooth of mystery.”','On the word “once”','Song look: warm downstage-center special; rest of stage to 50% over 3 s.','Next task: add cue row 7 for end of Ruth’s song.']
    ];
    state.cues = pirates.map(values => Object.fromEntries(fields.map(([f],i) => [f,values[i]])));
    state.cues.push(blank());
    hydrate();
    save('Loaded The Pirates of Penzance Act I opening (6 cues + 1 blank row for the end of Ruth’s song).');
  });
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

  // Interactive Booth Caller Trainer
  const callerSim = $('caller-sim');
  if (callerSim) {
    const MOMENTS = {
      curtain: {
        context: '[STAGE MONITOR]: Orchestra is 8 bars from the end of the Overture. Pirates are in discovered positions behind the main curtain.',
        sbCall: 'SM (you): “Standby Fly 1 and Lights 2.”',
        ackReply: 'FLY RAIL: “Fly standing by.”\nLIGHTING OP: “Lights standing by.”',
        goCall: 'SM (you): [Final chord cutoff] “Fly 1 and Lights 2… GO.”\n[STAGE MONITOR]: Main curtain flies out on a 4-count as the Cornwall rocky shore daylight wash fades up smoothly.',
        goFeedback: 'Clean execution! Naming both departments before a single “GO” keeps the curtain rise and the 4-second daylight fade locked together.',
        holdFeedback: 'HOLD called: Fly crew locks the batten brake immediately and Lighting freezes the crossfade.'
      },
      king: {
        context: '[STAGE MONITOR]: Opening chorus (“Pour, O Pour the Pirate Sherry”) is playing. Pirate King is waiting upstage of the R.C. rocky arch.',
        sbCall: 'SM (you): “Standby Sound 1.”',
        ackReply: 'SOUND OP (A1): “Sound standing by on Channel 7.”',
        goCall: 'SM (you): [Pirate King steps through R.C. arch] “Sound 1… GO.”\n[STAGE MONITOR]: Channel 7 unmutes cleanly at 0 dB just before the Pirate King speaks his first line.',
        goFeedback: 'Spot on! Unmuting on his visible entrance step guarantees his mic is live before his first consonant without picking up backstage chatter.',
        holdFeedback: 'HOLD called: Sound keeps Channel 7 muted until the entrance obstruction is cleared.'
      },
      ruth: {
        context: '[STAGE MONITOR]: SAMUEL asks, “An error? What error?” RUTH prepares to rise and confess her mistake before singing her solo.',
        sbCall: 'SM (you): “Standby Sound 2 and Lights 3.”',
        ackReply: 'SOUND OP: “Sound standing by.”\nLIGHTING OP: “Lights standing by.”',
        goCall: 'SM (you): [Ruth rises] “Sound 2… GO.” … [Ruth says “Better have it out at ONCE”] “Lights 3… GO.”\n[STAGE MONITOR]: Ruth’s mic opens before her spoken line, and the warm downstage-center special blooms on the word “once.”',
        goFeedback: 'Textbook musical calling! Opening the mic on her physical rise and calling the lighting special on the exact cadence word “once” frames the solo.',
        holdFeedback: 'HOLD called: Crew pauses transition and awaits Stage Manager instructions.'
      },
      hold: {
        context: '[STAGE MONITOR]: During a fast blackout shift, the stage-left deck captain spots a chorus member’s cloak snagged on a moving rock wagon near the fly line.',
        sbCall: 'SM (you): “Standby Deck Shift 4 and Fly 3.”',
        ackReply: 'DECK CHIEF: “Wait—cloak snagged on SL wagon! Do not move!”',
        goCall: 'WARNING: Never call GO when a crew member reports a fouled line or actor in a hazard zone! Click Emergency: “HOLD!” instead.',
        goFeedback: 'Safety violation! When a wagon or fly line is fouled, calling GO risks injury or torn scenery. Always call “HOLD!” immediately.',
        holdFeedback: 'Correct safety call! Saying “HOLD! HOLD! HOLD!” on headset immediately stops all fly, wagon, and automation movement until the deck chief confirms “All clear.”'
      }
    };
    let currentMoment = 'curtain';
    let stepState = 0; // 0 = initial, 1 = standby called, 2 = crew acked, 3 = complete
    const logEl = $('caller-log');
    const fbEl = $('caller-feedback');
    const momentBtns = callerSim.querySelectorAll('[data-moment]');

    function renderCaller(lines, fbText, fbTone) {
      logEl.textContent = lines.join('\n');
      fbEl.textContent = fbText;
      fbEl.className = 'te-readout' + (fbTone ? ' ' + fbTone : '');
    }

    function selectMoment(key) {
      currentMoment = key;
      stepState = 0;
      momentBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.moment === key)));
      const m = MOMENTS[key];
      renderCaller([m.context], 'Step 1: Call Standby to alert the crew before the trigger arrives.', '');
    }

    momentBtns.forEach(b => b.addEventListener('click', () => selectMoment(b.dataset.moment)));

    $('caller-btn-sb')?.addEventListener('click', () => {
      const m = MOMENTS[currentMoment];
      stepState = 1;
      renderCaller([m.context, m.sbCall], 'Step 2: Poll the crew so every department confirms “standing by” before you call GO.', 'warn');
    });

    $('caller-btn-ack')?.addEventListener('click', () => {
      const m = MOMENTS[currentMoment];
      if (stepState < 1) {
        renderCaller([m.context], 'Call Standby first! Crew cannot acknowledge a cue you haven’t warned them about.', 'bad');
        return;
      }
      stepState = 2;
      renderCaller([m.context, m.sbCall, m.ackReply], currentMoment === 'hold' ? 'Hazard reported on deck! Call Emergency “HOLD!” immediately.' : 'Step 3: Crew is standing by. Watch the script/score trigger and call GO!', 'warn');
    });

    $('caller-btn-go')?.addEventListener('click', () => {
      const m = MOMENTS[currentMoment];
      if (currentMoment === 'hold') {
        renderCaller([m.context, m.sbCall, m.ackReply, m.goCall], m.goFeedback, 'bad');
        return;
      }
      if (stepState === 0) {
        renderCaller([m.context, 'SM (you): “GO!” (called cold with no Standby)'], 'Too sudden! Calling GO without a Standby catches operators off-guard and causes late cues.', 'bad');
        return;
      }
      if (stepState === 1) {
        renderCaller([m.context, m.sbCall, 'SM (you): “GO!” (called before crew acknowledged readiness)'], 'Wait for acknowledgment! Always confirm the fly rail and board operators answered “standing by” before calling GO.', 'warn');
        return;
      }
      stepState = 3;
      renderCaller([m.context, m.sbCall, m.ackReply, m.goCall], m.goFeedback, 'good');
    });

    $('caller-btn-hold')?.addEventListener('click', () => {
      const m = MOMENTS[currentMoment];
      stepState = 3;
      renderCaller([m.context, 'SM (you): “HOLD! HOLD! All departments HOLD!”'], m.holdFeedback, currentMoment === 'hold' ? 'good' : 'warn');
    });

    $('caller-btn-reset')?.addEventListener('click', () => selectMoment(currentMoment));
    selectMoment('curtain');
  }
})();
