/* Human review, staff-assisted entry and local visual example matching. No network inference. */
export function createMeasureCoach(ctx) {
  const C=window.FakeBookPDFCoachModel, M=window.FakeBookPDFModel, MN=window.MusicNotation;
  const $=name=>ctx.desk.querySelector('[data-coach-'+name+']');
  let mode=false, gesture, selected=-1, base, zipPromise;
  const current=()=>ctx.get().draft?.bars[ctx.get().bar];
  const say=text=>{$('status').textContent=text;};
  const tokens=()=> (current()?.notes||'').trim().split(/\s+/).filter(Boolean);
  function invalidate() {
    const c=ctx.get(), b=current(); if(!b?.source) return;
    b.source.reviewed=false;
    if (c.book) c.book.examples=(c.book.examples||[]).filter(e=>e.id!==b.source.id);
  }
  function saveBox(rect) {
    if(!C.boxValid(rect)) {say('Use a box inside the page, at least 0.5% wide and tall.');return;}
    const c=ctx.get(),b=current();
    if(!b) {say('Choose or create a song draft first.');return;}
    invalidate();
    b.source={id:b.source?.id||'measure-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),page:c.page,box:rect,clef:b.source?.clef||'treble',reviewed:false};
    ctx.persist();refresh();say('Measure box saved. Find or mark its five staff lines.');
  }
  function point(event) { const r=$('overlay').getBoundingClientRect();if(!r.width||!r.height)return {x:0,y:0};return {x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))}; }
  function setMode(on) {mode=on;$('draw').setAttribute('aria-pressed',String(on));$('draw').textContent=on?'Finish boxing':'Box this measure';$('overlay').classList.toggle('is-drawing',on);if(on)say('Drag around this measure, including its chord symbols. Existing boxes can be moved or resized.');}
  $('draw').onclick=()=>setMode(!mode);
  $('overlay').addEventListener('pointerdown',event=>{
    const c=ctx.get(); if(!c.draft || ctx.canvas.dataset.renderedPage!==String(c.page)) return;
    const hit=event.target.closest('[data-measure]');
    if(hit && Number(hit.dataset.measure)!==c.bar) {ctx.select(Number(hit.dataset.measure));return;}
    if(!mode) {if(hit)ctx.select(Number(hit.dataset.measure));return;}
    event.preventDefault();$('overlay').setPointerCapture(event.pointerId);
    gesture={start:point(event),old:current()?.source?.box,corner:event.target.dataset.corner,kind:hit?(event.target.dataset.corner?'resize':'move'):'draw'};
  });
  $('overlay').addEventListener('pointermove',event=>{
    if(!gesture)return;const p=point(event),g=gesture;
    if(g.kind==='move')g.next=C.move(g.old,p.x-g.start.x,p.y-g.start.y);
    else if(g.kind==='resize'){const opposite={x:g.corner.includes('l')?g.old.x+g.old.w:g.old.x,y:g.corner.includes('t')?g.old.y+g.old.h:g.old.y};g.next=C.box(opposite,p);}
    else g.next=C.box(g.start,p);
    paintBoxes(g.next);
  });
  $('overlay').addEventListener('pointerup',event=>{if(!gesture)return;const g=gesture;gesture=null;if($('overlay').hasPointerCapture(event.pointerId))$('overlay').releasePointerCapture(event.pointerId);if(g.next)saveBox(g.next);else paintBoxes();});
  $('overlay').addEventListener('pointercancel',()=>{gesture=null;paintBoxes();});
  function paintBoxes(temporary) {
    const c=ctx.get();$('overlay').replaceChildren();if(!c.draft)return;
    c.draft.bars.forEach((b,i)=>{
      if(!b.source || b.source.page!==c.page)return;const r=i===c.bar&&temporary?temporary:b.source.box;if(!C.boxValid(r))return;
      const group=document.createElementNS('http://www.w3.org/2000/svg','g');group.dataset.measure=i;
      const rect=document.createElementNS(group.namespaceURI,'rect');Object.entries({x:r.x*1000,y:r.y*1000,width:r.w*1000,height:r.h*1000}).forEach(([k,v])=>rect.setAttribute(k,v));rect.setAttribute('class',[i===c.bar?'is-selected':'',b.source.reviewed?'is-reviewed':''].filter(Boolean).join(' '));group.append(rect);
      const label=document.createElementNS(group.namespaceURI,'text');label.setAttribute('x',r.x*1000+5);label.setAttribute('y',r.y*1000+18);label.textContent='Bar '+(i+1)+(b.source.reviewed?' ✓':'');group.append(label);
      if(i===c.bar)for(const corner of ['tl','tr','bl','br']){const h=document.createElementNS(group.namespaceURI,'rect');h.dataset.corner=corner;h.setAttribute('class','fb-coach-handle');h.setAttribute('x',(r.x+(corner.includes('r')?r.w:0))*1000-5);h.setAttribute('y',(r.y+(corner.includes('b')?r.h:0))*1000-5);h.setAttribute('width','10');h.setAttribute('height','10');group.append(h);}
      $('overlay').append(group);
    });
    if(temporary && !current()?.source) {const r=document.createElementNS('http://www.w3.org/2000/svg','rect');Object.entries({x:temporary.x*1000,y:temporary.y*1000,width:temporary.w*1000,height:temporary.h*1000,class:'is-selected'}).forEach(([k,v])=>r.setAttribute(k,v));$('overlay').append(r);}
  }
  function crop() {
    const c=ctx.get(),s=current()?.source; base=null;
    if(!s || s.page!==c.page || ctx.canvas.dataset.renderedPage!==String(c.page)) { $('crop').width=1;$('crop').height=1;return; }
    const r=s.box;base=document.createElement('canvas');const width=Math.min(900,Math.round(ctx.canvas.width*r.w));
    base.width=Math.max(1,width);base.height=Math.max(1,Math.round(width*r.h*ctx.canvas.height/(r.w*ctx.canvas.width)));
    base.getContext('2d', { willReadFrequently: true }).drawImage(ctx.canvas,r.x*ctx.canvas.width,r.y*ctx.canvas.height,r.w*ctx.canvas.width,r.h*ctx.canvas.height,0,0,base.width,base.height);
    const out=$('crop');out.width=base.width;out.height=base.height;const g=out.getContext('2d');g.drawImage(base,0,0);
    if(C.staffValid(s.staff)){g.strokeStyle='#087eaa';g.lineWidth=1;for(let l=0;l<5;l++){const y=(s.staff.top+(s.staff.bottom-s.staff.top)*l/4)*out.height;g.beginPath();g.moveTo(0,y);g.lineTo(out.width,y);g.stroke();}}
  }
  function signature() {
    if(!base)throw new Error('Show the boxed measure’s page and wait for it to render.');
    const reduced=document.createElement('canvas');reduced.width=64;reduced.height=32;const g=reduced.getContext('2d',{willReadFrequently:true});g.drawImage(base,0,0,64,32);
    const data=g.getImageData(0,0,64,32).data,s=current().source.staff,bytes=new Uint8Array(256);
    for(let i=0;i<2048;i++){const y=Math.floor(i/64)/32;let line=false;if(C.staffValid(s))for(let l=0;l<5;l++)if(Math.abs(y-(s.top+(s.bottom-s.top)*l/4))<.008)line=true;
      if(!line && data[i*4]+data[i*4+1]+data[i*4+2]<660)bytes[i>>3]|=1<<(i%8);}
    return btoa(String.fromCharCode(...bytes));
  }
  $('bounds').onclick=()=>saveBox(Object.fromEntries(['x','y','w','h'].map(k=>[k,Number($(k).value)/100])));
  $('jump').onclick=()=>{const s=current()?.source;if(s)ctx.jump(s.page);else say('Box a measure on its source page first.');};
  $('staff').onclick=()=>{
    try{if(!base)throw new Error('Box the measure on the visible PDF page first.');
      const b=current(); if(!b?.source) throw new Error('Box this measure first.');
      const image=base.getContext('2d',{willReadFrequently:true}).getImageData(0,0,base.width,base.height);
      const found=C.staff(image.data,base.width,base.height);if(!found)throw new Error('Could not find five consistent lines. Enter their top and bottom percentages manually.');invalidate();b.source.staff=found;ctx.persist();refresh();say('Staff lines suggested in blue. Check them before clicking noteheads.');
    }catch(e){say(e.message);}
  };
  $('calibrate').onclick=()=>{const s={top:Number($('top').value)/100,bottom:Number($('bottom').value)/100};if(!current()?.source||!C.staffValid(s)){say('Box a measure and enter valid top/bottom staff-line positions.');return;}invalidate();current().source.staff=s;ctx.persist();refresh();say('Staff calibration saved. Click noteheads to add pitches with your chosen duration.');};
  $('clef').onchange=()=>{if(current()?.source){invalidate();current().source.clef=$('clef').value;ctx.persist();refresh();}};
  $('crop').onclick=event=>{
    try{const c=ctx.get(),b=current(),r=$('crop').getBoundingClientRect();if(!base||!b?.source)throw new Error('Show the boxed measure first.');
      const name=C.pitch((event.clientY-r.top)/r.height,b.source.staff,b.source.clef,c.draft.key,c.draft.mode,$('accidental').value);
      const token=name+ctx.field('duration').value+(ctx.field('triplet').checked?'3':'')+(ctx.field('dot').checked?'.':'')+(ctx.field('tie').checked?'~':'');
      setNotes(tokens().concat(token).join(' '));say('Added '+token+'. Check accidental and rhythm; the vertical position supplies the pitch.');
    }catch(e){say(e.message);}
  };
  function setNotes(text){ctx.field('notes').value=text;ctx.field('notes').dispatchEvent(new Event('input',{bubbles:true}));}
  function selectNote(i){selected=i;$('token').value=tokens()[i]||'';renderNotes();}
  $('edit').onclick=()=>{try{const t=$('token').value.trim();if(selected<0||selected>=tokens().length)throw new Error('Select a note first.');if(/\s/.test(t))throw new Error('Edit one note token at a time.');M.beats(t);const list=tokens();list[selected]=t;setNotes(list.join(' '));say('Note corrected. Review this measure again to update its example.');}catch(e){say(e.message);}};
  $('token').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('edit').click();}};
  $('remove').onclick=()=>{if(selected<0)return;const list=tokens();list.splice(selected,1);selected=-1;setNotes(list.join(' '));};
  function preview(target,notes,chords) {
    try {
      const list=notes.trim().split(/\s+/).filter(Boolean),c=ctx.get(),s=current()?.source,clef=s?.clef||'treble',bottom=128,sp=12,baseDia=clef==='bass'?18:30;
      const expected=c.bar===0&&Number(c.draft.pickup)?Number(c.draft.pickup):c.draft.meter.split('/').reduce((n,d)=>Number(n)*4/Number(d)),width=Math.max(500,list.length*48+100),usable=width-105;let time=0;
      let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' 210" role="img" aria-label="Editable measure notation preview"><text x="12" y="20">'+MN.escape(c.draft.key+' '+c.draft.mode+' · '+c.draft.meter+' · bar '+(c.bar+1))+'</text>';
      for(let l=0;l<5;l++)svg+='<line x1="12" x2="'+(width-15)+'" y1="'+(bottom-l*sp)+'" y2="'+(bottom-l*sp)+'" stroke="#333"/>';
      svg+=MN.clef(clef,18,bottom,sp);svg+='<text x="76" y="48">'+MN.escape(chords||'No chord labels')+'</text>';
      list.forEach((token,i)=>{
        const dur=M.beats(token),m=token.match(/^([A-G](?:##|bb|#|b)?\d|r)([whqes])(3)?(\.)?(~)?$/);if(!m)throw new Error('Correct the note tokens to show notation.');
        const x=78+time/Math.max(expected,M.beats(notes))*usable,raw={w:4,h:2,q:1,e:.5,s:.25}[m[2]],beats=raw*(m[4]?1.5:1);svg+='<g data-coach-note="'+i+'" class="'+(i===selected?'is-selected':'')+'">';
        if(m[1]==='r')svg+=MN.glyph({w:'restWhole',h:'restHalf',q:'restQuarter',e:'rest8',s:'rest16'}[m[2]],x,bottom-2*sp,sp);
        else{const pitch=MN.parsePitch(m[1]),step=pitch.diatonic-baseDia,y=bottom-step*sp/2;MN.ledgerSteps(step).forEach(l=>{svg+='<line x1="'+(x-12)+'" x2="'+(x+12)+'" y1="'+(bottom-l*sp/2)+'" y2="'+(bottom-l*sp/2)+'" stroke="#333"/>';});
          if(pitch.a)svg+=MN.accidental(pitch.a,x-25,y,sp);svg+=MN.note(x,y,sp,beats,!!m[4],step<4,'',step%2===0);
          svg+='<text class="fb-coach-pitch-label" x="'+x+'" y="'+(y+3)+'" text-anchor="middle">'+MN.escape(MN.pitchName(pitch))+'</text>';if(m[5])svg+='<text x="'+(x+8)+'" y="'+(y+25)+'">⌒</text>';}
        if(m[3])svg+='<text x="'+x+'" y="65">3</text>';svg+='</g>';time+=dur;
      });
      target.innerHTML=svg+'</svg>';
    } catch(e){target.textContent=e.message;}
  }
  function renderNotes() {
    $('notes').replaceChildren();tokens().forEach((t,i)=>{const b=document.createElement('button');b.type='button';b.className='fb-btn';b.textContent=(i+1)+'. '+t;b.setAttribute('aria-pressed',String(i===selected));b.onclick=()=>selectNote(i);$('notes').append(b);});
    if(current())preview($('preview'),current().notes,current().chords);
  }
  $('preview').onclick=e=>{const n=e.target.closest('[data-coach-note]');if(n)selectNote(Number(n.dataset.coachNote));};
  function validBar() {
    const c=ctx.get(),b=current(),full=c.draft.meter.split('/').reduce((n,d)=>Number(n)*4/Number(d)),pickup=c.bar===0?Number(c.draft.pickup):0;
    const probe={...c.draft,pickup,bars:[{...b,notes:b.notes.replace(/~/g,'')}]};if(pickup)probe.bars.push({notes:Array.from({length:Math.round(full*4)},()=> 'rs').join(' '),chords:''});
    M.tune(probe,'Review validation');
  }
  $('review').onclick=()=>{try{const c=ctx.get(),b=current();if(!b?.source||!base)throw new Error('Box this measure on its visible source page first.');validBar();
    const example={id:b.source.id,fingerprint:c.fingerprint,draftId:c.draft.id,title:c.draft.title,bar:c.bar+1,page:b.source.page,box:{...b.source.box},staff:b.source.staff&&{...b.source.staff},clef:b.source.clef||'treble',key:c.draft.key,mode:c.draft.mode,meter:c.draft.meter,notes:b.notes,chords:b.chords,signature:signature(),image:base.toDataURL('image/png'),reviewedAt:new Date().toISOString()};
    c.book.examples=(c.book.examples||[]).filter(e=>e.id!==example.id).concat(example);b.source.reviewed=true;ctx.persist();refresh();say('Reviewed example saved. Similar measures can now suggest these notes and chord labels.');
  }catch(e){say(e.message);}};
  $('match').onclick=()=>{try{const c=ctx.get(),b=current();if(!b)throw new Error('Choose a song bar first.');const result=C.match(signature(),(c.book?.examples||[]).filter(e=>e.id!==b.source?.id),{...c.draft,clef:b.source?.clef||'treble'});
    if(!result)throw new Error('No sufficiently similar reviewed example yet. Enter and check this measure to teach an example.');
    b.proposal={notes:result.example.notes,chords:result.example.chords,origin:'Reviewed example: '+result.example.title+' bar '+result.example.bar,similarity:result.score};ctx.persist();proposal();say('Suggestion ready. Visual similarity is not a confidence guarantee; compare it with the scan.');
  }catch(e){say(e.message);}};
  function proposal(){const p=current()?.proposal;$('proposal').hidden=!p;if(!p)return;$('proposal-label').textContent=p.origin+(p.similarity!==undefined?' · '+Math.round(p.similarity*100)+'% visual similarity':'')+' · unreviewed';$('proposal-text').textContent=p.notes+' | Chords: '+(p.chords||'none');preview($('proposal-preview'),p.notes,p.chords);$('undo').disabled=!current().coachUndo;}
  $('accept').onclick=()=>{const b=current(),p=b?.proposal;if(!p)return;b.coachUndo={notes:b.notes,chords:b.chords};invalidate();b.notes=p.notes;b.chords=p.chords;ctx.fill();ctx.persist();refresh();say('Suggestion applied as a draft. Edit notes/chords and mark checked after verifying it.');};
  $('reject').onclick=()=>{if(current()){delete current().proposal;ctx.persist();proposal();}};
  $('undo').onclick=()=>{const b=current();if(!b?.coachUndo)return;invalidate();b.notes=b.coachUndo.notes;b.chords=b.coachUndo.chords;delete b.coachUndo;ctx.fill();ctx.persist();refresh();say('Previous notes and chords restored.');};
  function zipLib(){if(window.JSZip)return Promise.resolve(window.JSZip);return zipPromise||(zipPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('../../vendor/jszip.min.js',import.meta.url).href;script.onload=()=>resolve(window.JSZip);script.onerror=()=>{zipPromise=null;reject(new Error('The local ZIP helper could not load.'));};document.head.append(script);}));}
  async function download(zip,name){const blob=await zip.generateAsync({type:'blob'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('packet').onclick=async()=>{try{if(!base)throw new Error('Box and show a measure first.');const c=ctx.get(),b=current(),Z=await zipLib(),zip=new Z();zip.file('measure.png',base.toDataURL('image/png').split(',')[1],{base64:true});
    zip.file('request.json',JSON.stringify({schema:'fakebook-measure-request/v1',fingerprint:c.fingerprint,draftId:c.draft.id,title:c.draft.title,bar:c.bar+1,page:b.source.page,box:b.source.box,staff:b.source.staff,clef:b.source.clef||'treble',key:c.draft.key,mode:c.draft.mode,meter:c.draft.meter,pickup:c.draft.pickup,current:{notes:b.notes,chords:b.chords},noteSyntax:'C4q, F#4e, Bb4h, rq; durations w h q e s; dot ., triplet 3, tie ~. Sounding accidentals must be explicit. Chords e.g. Dm7:2 G7:2. Do not silently guess unclear notes.',responseTemplate:{schema:'fakebook-measure-proposals/v1',fingerprint:c.fingerprint,draftId:c.draft.id,measures:[{bar:c.bar+1,notes:'',chords:''}]}},null,2));await download(zip,'fake-book-measure-'+(c.bar+1)+'.zip');say('Exported the crop and source metadata. An assistant/OMR tool can return proposed measures JSON.');
  }catch(e){say(e.message);}};
  $('dataset').onclick=async()=>{try{const examples=ctx.get().book?.examples||[];if(!examples.length)throw new Error('Mark at least one measure checked before exporting training examples.');const Z=await zipLib(),zip=new Z();const rows=examples.map((e,i)=>{const {image,signature,...metadata}=e;const file='measures/'+(i+1)+'.png';zip.file(file,image.split(',')[1],{base64:true});return {...metadata,image:file,status:'human-reviewed'};});zip.file('annotations.json',JSON.stringify({schema:'fakebook-reviewed-measures/v1',coordinateUnits:'fractions of original PDF page',examples:rows},null,2));await download(zip,'fake-book-reviewed-training.zip');say('Exported '+examples.length+' reviewed crop/label pairs for training.');}catch(e){say(e.message);}};
  $('import').onchange=async()=>{const file=$('import').files[0];if(!file)return;try{if(file.size>2*1024*1024)throw new Error('Proposal JSON must be smaller than 2 MB.');const data=JSON.parse(await file.text()),c=ctx.get();if(data.schema!=='fakebook-measure-proposals/v1'||data.fingerprint!==c.fingerprint||data.draftId!==c.draft.id||!Array.isArray(data.measures)||!data.measures.length)throw new Error('The proposal must identify this PDF and the selected draft. Use the response template in the measure packet.');
    const seen=new Set();data.measures.forEach(m=>{if(!Number.isInteger(m.bar)||m.bar<1||m.bar>c.draft.bars.length||seen.has(m.bar)||typeof m.notes!=='string'||m.notes.length>2000||typeof m.chords!=='string'||m.chords.length>1000)throw new Error('Invalid or duplicate proposed bar.');M.beats(m.notes);seen.add(m.bar);});
    data.measures.forEach(m=>{c.draft.bars[m.bar-1].proposal={notes:m.notes,chords:m.chords,origin:'Imported recognition proposal'};});ctx.persist();refresh();say(data.measures.length+' proposed measures imported. Current notation is unchanged until you choose Use suggestion.');
  }catch(e){say(e.message);} $('import').value='';};
  function refresh() {
    const c=ctx.get(),b=current();paintBoxes();crop();if(!b)return;
    const s=b.source;['x','y','w','h'].forEach(k=>{if(document.activeElement!==$(k))$(k).value=s?(s.box[k]*100).toFixed(1):'';});if(document.activeElement!==$('top'))$('top').value=s?.staff?(s.staff.top*100).toFixed(1):'';if(document.activeElement!==$('bottom'))$('bottom').value=s?.staff?(s.staff.bottom*100).toFixed(1):'';$('clef').value=s?.clef||'treble';
    $('count').textContent=(c.book?.examples||[]).length+' reviewed examples in this PDF workspace.';renderNotes();proposal();if(s?.reviewed)say('This measure is human-reviewed. Editing its box, notes, chords or key requires reviewing it again.');
  }
  return {refresh,invalidate,setMode};
}
