(() => {
  'use strict';
  const $ = id => document.getElementById(id), MN = window.MusicNotation;
  const offsets = {alto: -9, tenor: -14, soprano: -2, baritone: -21};
  const F=window.SaxFingerings;
  F.notes.forEach(n=>$('sxNote').add(new Option(n.flat,n.midi)));
  $('sxNote').value='71';
  let held=new Set(), studioView="note";
  const scale={phase:"idle",index:0,nextAt:0};
  const instrumentSVG = window.SaxDiagram;
  let ctx, out, nodes = [], timers = [], generation = 0;
  function stop() {
    generation++;
    timers.forEach(clearTimeout); timers=[];
    nodes.forEach(n => {try {n.stop();} catch (_) {}}); nodes=[];
    $('sxTransport').textContent='Stopped. Ready to begin again.';
    if(scale.phase!=='idle'){scale.phase='idle';scaleButtons();$('sxFingerTransport').textContent='Stopped. Choose Play to start again.';}
    document.querySelectorAll('.sax-staff .active').forEach(n=>n.classList.remove('active'));
  }
  async function ready() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Audio is unavailable in this browser. You can still read and compose.');
    if (!ctx) {
      // 'playback' = bigger hardware buffers; older iPads crackle at Safari's low-latency default.
      try { ctx = new Audio({ latencyHint: 'playback' }); } catch (_) { ctx = new Audio(); }
      out = ctx.createDynamicsCompressor();
      out.threshold.value = -10; out.knee.value = 6; out.ratio.value = 12; out.attack.value = .003; out.release.value = .15;
      out.connect(ctx.destination);
    }
    await ctx.resume();
  }
  function tone(pitch, at, duration, click=false) {
    const osc=ctx.createOscillator(), gain=ctx.createGain(), filter=ctx.createBiquadFilter();
    osc.type=click?'sine':'sawtooth';
    osc.frequency.value=click?900:440*2**((MN.parsePitch(pitch).midi+offsets[$('sxInstrument').value]-69)/12);
    filter.type='lowpass'; filter.frequency.value=click?2000:1600;
    const amplitude=click?.07:Number($('sxDynamic').value);
    gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(amplitude,at+.018);
    gain.gain.setValueAtTime(amplitude,at+Math.max(.02,duration-.05));gain.gain.linearRampToValueAtTime(0,at+duration);
    osc.connect(filter);filter.connect(gain);gain.connect(out);
    osc.start(at);osc.stop(at+duration+.02);nodes.push(osc);
    osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();nodes=nodes.filter(n=>n!==osc);};
  }
  function later(fn, ms) {timers.push(setTimeout(fn,ms));}
  async function play(notes, host, countIn=true) {
    if(studioView==='scale')switchView('note');
    stop(); const ticket=generation;
    try {await ready();} catch(e) {$('sxTransport').textContent=e.message;return;}
    if(ticket!==generation)return;
    const beat=60/Number($('sxTempo').value), start=ctx.currentTime+.08;
    let cursor=countIn?4:0;
    if(countIn) for(let i=0;i<4;i++) {tone('C4',start+i*beat,.07,true);later(()=>{$('sxTransport').textContent=`Count-in: ${i+1} of 4`;},(start-ctx.currentTime+i*beat)*1000);}
    notes.forEach((n,i)=>{
      const delay=(start-ctx.currentTime+cursor*beat)*1000;
      if(n.pitch)tone(n.pitch,start+cursor*beat,n.beats*beat*($('sxArticulation').value==='slurred'?.995:.8));
      later(()=>{
        $('sxTransport').textContent=`Beat ${cursorLabel(notes,i)} · ${n.pitch||'rest'} · ${n.beats} beat${n.beats>1?'s':''}`;
        if(host){host.querySelectorAll('.active').forEach(el=>el.classList.remove('active'));host.querySelector(`[data-note="${i}"]`)?.classList.add('active');}
        if(n.pitch) selectNote(n.pitch);
      },delay);
      cursor+=n.beats;
    });
    later(()=>{if(ticket===generation){$('sxTransport').textContent='Phrase complete. Try counting it yourself.';host?.querySelectorAll('.active').forEach(n=>n.classList.remove('active'));}},(start-ctx.currentTime+cursor*beat)*1000);
  }
  const cursorLabel=(notes,i)=>notes.slice(0,i).reduce((s,n)=>s+n.beats,1);
  function staff(host, notes, names=true) {
    const space=14, bottom=112, width=Math.max(340,100+notes.length*58), height=160;
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" class="sax-staff" viewBox="0 0 ${width} ${height}" role="img" aria-label="Written treble staff in four-four: ${notes.map(n=>(n.pitch||'rest')+' for '+n.beats+' beats').join(', ')}">`;
    for(let l=0;l<5;l++)svg+=`<line x1="8" x2="${width-8}" y1="${bottom-l*space}" y2="${bottom-l*space}"/>`;
    svg+=MN.clef('treble',14,bottom,space/2)+`<text x="65" y="${bottom-35}" font-size="20">4</text><text x="65" y="${bottom-7}" font-size="20">4</text>`;
    let beats=0;
    notes.forEach((n,i)=>{
      const x=94+i*58;
      svg+=`<g data-note="${i}">`;
      if(n.pitch){
        const p=MN.parsePitch(n.pitch),step=p.diatonic-MN.clefs.treble.bottom,y=bottom-step*space/2;
        MN.ledgerSteps(step).forEach(s=>{svg+=`<line x1="${x-12}" x2="${x+12}" y1="${bottom-s*space/2}" y2="${bottom-s*space/2}"/>`;});
        if(p.a || notes.slice(0,i).some(prev=>prev.pitch && MN.parsePitch(prev.pitch).l===p.l && MN.parsePitch(prev.pitch).o===p.o && MN.parsePitch(prev.pitch).a))svg+=MN.accidental(p.a,x-24,y,space);
        svg+=MN.note(x,y,space,n.beats,false,step<4,'',step%2===0);
      }else svg+=MN.glyph('restQuarter',x-7,bottom-2*space,space);
      if(names)svg+=`<text x="${x}" y="145">${n.pitch||'rest'}</text>`;
      svg+='</g>';beats+=n.beats;
      if(beats%4===0)svg+=`<line x1="${x+27}" x2="${x+27}" y1="${bottom}" y2="${bottom-4*space}"/>`;
    });
    host.innerHTML=svg+'</svg>';
  }
  function selected(){return F.byMidi.get(Number($('sxNote').value));}
  function variant(){return selected().variants[Number($('sxVariant').value)||0];}
  function refreshVariants(){const n=selected();$('sxVariant').replaceChildren(...n.variants.map((v,i)=>new Option(v.name,i)));}
  const keyCode={octave:'T',L1:'LH 1',L2:'LH 2',L3:'LH 3',R1:'RH 1',R2:'RH 2',R3:'RH 3',bis:'Bis',Gsharp:'G♯',lowCsharp:'Low C♯',lowB:'Low B',lowBflat:'Low B♭',sideBflat:'Side B♭',lowC:'Low C',Eflat:'E♭'};
  function fingeringCode(keys){return keys.length?keys.map(key=>keyCode[key]||key).join(' · '):'Open · no finger keys';}
  function miniFingering(keys){
    const dot=(key,label)=>`<span class="sx-mini-key ${keys.includes(key)?'is-pressed':''}">${label}</span>`;
    const auxiliaries=[['octave','T'],['bis','Bis'],['Gsharp','G♯'],['sideBflat','Side'],['Eflat','E♭'],['lowC','C'],['lowCsharp','C♯'],['lowB','B'],['lowBflat','B♭']].filter(([key])=>keys.includes(key));
    return `<span class="sx-mini-fingering" aria-hidden="true"><span class="sx-mini-hand"><i>LH</i>${dot('L1','1')}${dot('L2','2')}${dot('L3','3')}</span><span class="sx-mini-divider"></span><span class="sx-mini-hand"><i>RH</i>${dot('R1','1')}${dot('R2','2')}${dot('R3','3')}</span><span class="sx-mini-aux">${auxiliaries.length?auxiliaries.map(([,label])=>`<b>${label}</b>`).join(''):`<b>${keys.length?'NO AUX':'OPEN'}</b>`}</span></span>`;
  }
  function makeStaffExplorer() {
    const host=$('sxNoteStaff'), svg=host.querySelector('svg');
    if(!svg)return;
    const naturalNotes=[
      {midi:64,name:'E4',place:'bottom line'}, {midi:65,name:'F4',place:'first space'},
      {midi:67,name:'G4',place:'second line'}, {midi:69,name:'A4',place:'second space'},
      {midi:71,name:'B4',place:'middle line'}, {midi:72,name:'C5',place:'third space'},
      {midi:74,name:'D5',place:'fourth line'}, {midi:76,name:'E5',place:'top space'},
      {midi:77,name:'F5',place:'top line'}
    ];
    const selectedDiatonic=MN.parsePitch(selected()[$('sxSpelling').value]).diatonic, ns='http://www.w3.org/2000/svg';
    let index=Math.max(0,naturalNotes.findIndex(note=>MN.parsePitch(note.name).diatonic===selectedDiatonic));
    svg.setAttribute('aria-label','Interactive treble staff. Choose a line or space to learn its note and saxophone fingering.');
    const highlight=document.createElementNS(ns,'rect');
    highlight.setAttribute('x','72');highlight.setAttribute('y',String(108.5-index*7));
    highlight.setAttribute('width','260');highlight.setAttribute('height','7');highlight.setAttribute('rx','3');
    highlight.setAttribute('class','sx-staff-highlight');svg.append(highlight);
    const surface=document.createElementNS(ns,'rect');
    surface.setAttribute('x','72');surface.setAttribute('y','52.5');surface.setAttribute('width','260');surface.setAttribute('height','63');
    surface.setAttribute('class','sx-staff-surface');surface.setAttribute('role','button');surface.setAttribute('tabindex','0');
    const describe=()=>surface.setAttribute('aria-label',`${naturalNotes[index].name}, ${naturalNotes[index].place}, selected. Use up and down arrows or click another staff position.`);
    const choose=(next,focus=false)=>{index=Math.max(0,Math.min(naturalNotes.length-1,next));stop();selectNote(naturalNotes[index].name);if(focus)requestAnimationFrame(()=>$('sxNoteStaff').querySelector('.sx-staff-surface')?.focus());};
    surface.addEventListener('click',event=>{
      const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
      const local=point.matrixTransform(svg.getScreenCTM().inverse());
      choose(Math.round((112-local.y)/7),true);
    });
    surface.addEventListener('keydown',event=>{
      if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();choose(index+(event.key==='ArrowUp'?1:-1),true);}
      if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(index,true);}
    });
    describe();svg.append(surface);
  }
  function showFingering(reset=true) {
    const n=selected(), v=variant(), name=n[$('sxSpelling').value];
    if(reset)held=new Set(v.keys);
    const keys=[...held], concertMidi=n.midi+offsets[$('sxInstrument').value];
    const flatNames=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
    $('sxPitch').textContent=`Written ${name} → sounds ${flatNames[concertMidi%12]}${Math.floor(concertMidi/12)-1} · ${$('sxInstrument').selectedOptions[0].text}`;
    $('sxFingerDiagram').innerHTML=`<figure data-zoomable data-lightbox-group="sax-studio"><img alt="${name} fingering: ${fingeringCode(keys)}" src="data:image/svg+xml,${encodeURIComponent(instrumentSVG(keys,name))}"><figcaption class="sx-diagram-caption">Written ${name}. Numbered filled circles mark pressed finger touches; open circles mark released touches. Original ClassroomOS illustration based on YAS-280 references, with enlarged views of hidden keys.</figcaption></figure>`;
    $('sxKeyControls').innerHTML=F.keys.map(k=>`<button type="button" data-key="${k.id}" aria-pressed="${held.has(k.id)}" ${$('sxFingerMode').value==='explore'?'disabled':''}><span class="sax-dot ${held.has(k.id)?'closed':''}" aria-hidden="true"></span>${k.label}</button>`).join('');
    $('sxKeyControls').querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{const key=b.dataset.key;held.has(key)?held.delete(key):held.add(key);showFingering(false);$('sxKeyControls').querySelector(`[data-key="${key}"]`).focus();});
    const touchNames={L1:'LH 1 index',L2:'LH 2 middle',L3:'LH 3 ring',R1:'RH 1 index',R2:'RH 2 middle',R3:'RH 3 ring',bis:'bis B♭',Gsharp:'G♯',lowCsharp:'low C♯',lowB:'low B',lowBflat:'low B♭',sideBflat:'side B♭',lowC:'low C',Eflat:'E♭'};
    const left=keys.filter(k=>['L1','L2','L3','bis','Gsharp','lowCsharp','lowB','lowBflat'].includes(k)).map(k=>touchNames[k]);
    const right=keys.filter(k=>['R1','R2','R3','sideBflat','lowC','Eflat'].includes(k)).map(k=>touchNames[k]);
    $('sxFingerText').textContent=keys.length?`Press — Left hand: ${left.join(', ')||'none'}. Right hand: ${right.join(', ')||'none'}.${held.has('octave')?' Add T, the left-thumb octave key.':''}`:'Open fingering: release all finger keys. Your thumbs still support the instrument; keep every fingertip close.';
    $('sxFingerTip').textContent=v.tip;
    const building=studioView==='note'&&$('sxFingerMode').value!=='explore';
    $('sxBuildTools').hidden=!building;
    $('sxKeyControls').hidden=!building;
    $('sxFingerText').classList.toggle('sx-visible-reading',!building);
    $('sxFingerResult').textContent='';
    staff($('sxNoteStaff'),[{pitch:name,beats:1}]);
    makeStaffExplorer();
    $('sxChart')?.querySelectorAll('[data-midi]').forEach(button=>button.setAttribute('aria-current',String(Number(button.dataset.midi)===n.midi)));

    return name;
  }
  function selectNote(name){const n=F.notes.find(n=>n.flat===name||n.sharp===name);if(!n)return;$('sxNote').value=n.midi;refreshVariants();showFingering();}
  function academicChart(notes) {
    const cols=10, cellW=132, cellH=300, top=92, rows=Math.ceil(notes.length/cols);
    const width=cols*cellW+40, height=top+rows*cellH+76;
    const circle=(x,y,key,keys,r=8)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${keys.includes(key)?'#111':'#fff'}" stroke="#111" stroke-width="2"/>${['L1','L2','L3','R1','R2','R3'].includes(key)?`<text x="${x}" y="${y+3}" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="${keys.includes(key)?'#fff':'#111'}">${key.slice(1)}</text>`:''}`;
    const oval=(x,y,key,keys,rx=8,ry=4)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${keys.includes(key)?'#111':'#fff'}" stroke="#111" stroke-width="1.6"/>`;
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="sxAcademicTitle sxAcademicDesc"><title id="sxAcademicTitle">Saxophone primary fingering chart</title><desc id="sxAcademicDesc">Written notes with treble staff positions and open or filled key-touch symbols. Filled shapes are pressed keys.</desc><rect width="100%" height="100%" fill="#fff"/><text x="${width/2}" y="30" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" letter-spacing="2">SAXOPHONE PRIMARY FINGERINGS</text><text x="${width/2}" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="13">WRITTEN PITCH · SOLID = PRESS · OPEN = RELEASE</text>`;
    notes.forEach((note,i)=>{
      const col=i%cols,row=Math.floor(i/cols),x=20+col*cellW,y=top+row*cellH,cx=x+cellW/2;
      const name=note[$('sxSpelling').value], keys=note.variants[0].keys, parsed=MN.parsePitch(name);
      const staffBottom=y+62, step=parsed.diatonic-MN.clefs.treble.bottom, noteY=staffBottom-step*3.5;
      svg+=`<g><text x="${cx}" y="${y-12}" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700">${name}</text>`;
      for(let line=0;line<5;line++)svg+=`<line x1="${cx-31}" x2="${cx+31}" y1="${staffBottom-line*7}" y2="${staffBottom-line*7}" stroke="#111" stroke-width="1"/>`;
      MN.ledgerSteps(step).forEach(s=>{svg+=`<line x1="${cx-10}" x2="${cx+10}" y1="${staffBottom-s*3.5}" y2="${staffBottom-s*3.5}" stroke="#111" stroke-width="1"/>`;});
      if(parsed.a)svg+=`<text x="${cx-14}" y="${noteY+5}" text-anchor="middle" font-family="serif" font-size="17">${{'-2':'𝄫','-1':'♭','1':'♯','2':'𝄪'}[parsed.a]}</text>`;
      svg+=`<ellipse cx="${cx}" cy="${noteY}" rx="7" ry="4.5" fill="#111" transform="rotate(-18 ${cx} ${noteY})"/>`;
      svg+=`<text x="${cx-18}" y="${y+92}" text-anchor="end" font-family="Arial,sans-serif" font-size="8">L</text>`;
      svg+=circle(cx,y+101,'L1',keys)+circle(cx,y+123,'L2',keys)+circle(cx,y+145,'L3',keys);
      svg+=circle(cx-34,y+101,'octave',keys,7)+oval(cx-17,y+106,'bis',keys,4,8)+oval(cx-26,y+145,'Gsharp',keys,4,9);
      svg+=oval(cx-25,y+161,'lowCsharp',keys,7,4)+oval(cx,y+161,'lowB',keys,7,4)+oval(cx+25,y+161,'lowBflat',keys,7,4);
      svg+=`<line x1="${cx-29}" x2="${cx+29}" y1="${y+174}" y2="${y+174}" stroke="#999" stroke-width="1"/><text x="${cx-18}" y="${y+188}" text-anchor="end" font-family="Arial,sans-serif" font-size="8">R</text>`;
      svg+=circle(cx,y+194,'R1',keys)+circle(cx,y+216,'R2',keys)+circle(cx,y+238,'R3',keys);
      svg+=oval(cx+26,y+194,'sideBflat',keys,4,9)+oval(cx+26,y+218,'Eflat',keys,4,9)+oval(cx+26,y+238,'lowC',keys,4,9);
      svg+=`<text x="${cx}" y="${y+264}" text-anchor="middle" font-family="Arial,sans-serif" font-size="9">OCT ${keys.includes('octave')?'ON':'OFF'}</text></g>`;
    });
    svg+=`<g transform="translate(34 ${height-38})" font-family="Arial,sans-serif" font-size="11"><circle cx="6" cy="0" r="6" fill="#111"/><text x="18" y="4">pressed</text><circle cx="92" cy="0" r="6" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="104" y="4">released</text><text x="190" y="4">L = left-hand stack · R = right-hand stack · surrounding ovals = auxiliary keys</text></g></svg>`;
    $('sxAcademicChart').innerHTML=`<figure data-zoomable data-lightbox-group="sax-academic"><img src="data:image/svg+xml,${encodeURIComponent(svg)}" alt="Academic saxophone fingering chart for ${notes.length} written notes. Each entry shows a treble staff note, numbered left-hand and right-hand main keys, and open or filled auxiliary key symbols."><figcaption><strong>Academic overview.</strong> Primary common fingering for each selected note. The vertical stack matches the studio: LH 1–3 above the divider and RH 1–3 below it. The left-thumb octave touch sits at upper left; smaller surrounding ovals represent bis, side, and little-finger touches. Solid means press; open means release. ClassroomOS original SVG, checked against the Yamaha fingering reference cited below.</figcaption></figure>`;
  }
  function chart(){
    const range=$('sxRange').value;
    const notes=F.notes.filter(n=>range==='first'?[64,65,67,69,71].includes(n.midi):range==='natural'?n.midi>=60&&n.flat===n.sharp:true);
    academicChart(notes);
    $('sxChart').innerHTML=notes.map(n=>{const name=n[$('sxSpelling').value],keys=n.variants[0].keys,current=n.midi===selected().midi;return `<button type="button" class="sx-chart-note" data-midi="${n.midi}" aria-current="${current}" aria-label="Choose written ${name}: ${fingeringCode(keys)}"><strong>${name}</strong>${miniFingering(keys)}<span class="sx-chart-code">${fingeringCode(keys)}</span></button>`;}).join('');
    $('sxChart').querySelectorAll('[data-midi]').forEach(button=>button.onclick=()=>{switchView('note');selectNote(F.byMidi.get(Number(button.dataset.midi)).flat);$('sxFingeringStudio').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  }
  refreshVariants();
  function switchView(view){
    stop();studioView=view;
    $('sxViewNote').setAttribute('aria-pressed',String(view==='note'));
    $('sxViewScale').setAttribute('aria-pressed',String(view==='scale'));
    $('sxSingleControls').hidden=view!=='note';$('sxNoteStaff').hidden=view!=='note';
    $('sxScaleChoices').hidden=view!=='scale';$('sxScalePractice').hidden=view!=='scale';
    if(view==='scale'){$('sxFingerMode').value='explore';scale.index=0;renderPath(true);}
    else showFingering();
  }
  $('sxViewNote').onclick=()=>switchView('note');$('sxViewScale').onclick=()=>switchView('scale');
  $('sxVariant').onchange=()=>{stop();showFingering();};
  $('sxSpelling').onchange=()=>{stop();F.notes.forEach((n,i)=>$('sxNote').options[i].text=n[$('sxSpelling').value]);showFingering();chart();renderPath(studioView==='scale');};
  $('sxFingerMode').onchange=()=>{switchView('note');showFingering();if($('sxFingerMode').value==='challenge'){held.clear();showFingering(false);}$('sxFingeringStudio').scrollIntoView({block:'start'});};
  $('sxRange').onchange=chart;
  ['sxPreviousNote','sxNextNote'].forEach((id,i)=>$(id).onclick=()=>{stop();const index=F.notes.indexOf(selected());selectNote(F.notes[(index+(i?1:-1)+F.notes.length)%F.notes.length].flat);});
  $('sxClearFingering').onclick=()=>{held.clear();showFingering(false);};
  $('sxRevealFingering').onclick=()=>showFingering();
  $('sxCheckFingering').onclick=()=>{$('sxFingerResult').textContent=F.keys.every(k=>held.has(k.id)===variant().keys.includes(k.id))?'Correct key choices.':'Compare your keys with the target. Try again or choose Reveal.';};
  $('sxNewChallenge').onclick=()=>{stop();selectNote(F.notes[Math.floor(Math.random()*F.notes.length)].flat);held.clear();showFingering(false);};
  function path(){let ns=F.patterns[$('sxFingerPattern').value].slice();if($('sxFingerDirection').value==='down')ns.reverse();if($('sxFingerDirection').value==='round')ns.push(...ns.slice(0,-1).reverse());return ns.map(m=>({pitch:F.byMidi.get(m)[$('sxSpelling').value],beats:1}));}
  function scaleButtons(){
    $('sxFingerPlay').textContent=scale.phase==='paused'?'Resume':scale.phase==='complete'?'Replay scale':'Play scale';
    $('sxFingerPlay').disabled=scale.phase==='playing';$('sxScalePause').disabled=scale.phase!=='playing';
    $('sxScalePrevious').disabled=scale.index===0;$('sxScaleNext').disabled=scale.index===path().length-1;
  }
  function renderPath(select=false){
    const focusIndex=$('sxFingerPath').contains(document.activeElement)?document.activeElement.dataset.scaleIndex:null;
    const directionNames=$('sxFingerPattern').value==='first'?['As written','Reverse','Out and back']:['Ascending','Descending','Up & down'];
    [...$('sxFingerDirection').options].forEach((option,i)=>option.text=directionNames[i]);
    const ns=path(), start=Math.floor(scale.index/8)*8, page=ns.slice(start,start+8);
    staff($('sxFingerPathStaff'),page);
    $('sxFingerPathStaff').querySelector(`[data-note="${scale.index-start}"]`)?.classList.add('active');
    $('sxScaleWindow').textContent=ns.length>8?`Notes ${start+1}–${start+page.length} of ${ns.length}`:'';
    $('sxScaleWindow').hidden=ns.length<=8;
    $('sxFingerPath').replaceChildren(...page.map((n,i)=>{const b=document.createElement('button');b.type='button';b.textContent=n.pitch;b.dataset.scaleIndex=start+i;b.setAttribute('aria-pressed',String(start+i===scale.index));b.onclick=()=>stepScale(start+i);return b;}));
    if(focusIndex!=null)$('sxFingerPath').querySelector(`[data-scale-index="${focusIndex}"]`)?.focus({preventScroll:true});
    if(select)selectNote(ns[scale.index].pitch);
    scaleButtons();
  }
  function scaleStatus(prefix){$('sxFingerTransport').textContent=`${prefix} · ${scale.index+1} / ${path().length} · written ${path()[scale.index].pitch}`;}
  function stepScale(index){stop();scale.index=index;renderPath(true);scaleStatus('Step');}
  ['sxFingerPattern','sxFingerDirection'].forEach(id=>$(id).onchange=()=>{stop();scale.index=0;renderPath(true);scaleStatus('Ready');});
  $('sxFingerTempo').oninput=()=>{$('sxFingerTempoOut').textContent=$('sxFingerTempo').value+' BPM';};
  // Only the next scale tone is scheduled, so pause can cancel immediately.
  function tickScale(ticket){
    if(ticket!==generation||scale.phase!=='playing')return;
    const ns=path(), beat=60/Number($('sxFingerTempo').value), at=Math.max(ctx.currentTime+.035,scale.nextAt);
    tone(ns[scale.index].pitch,at,beat*($('sxArticulation').value==='slurred'?.995:.8));
    later(()=>{if(ticket!==generation)return;renderPath(true);scaleStatus('Playing');},(at-ctx.currentTime)*1000);
    scale.nextAt=at+beat;
    later(()=>{if(ticket!==generation||scale.phase!=='playing')return;if(scale.index===ns.length-1){scale.phase='complete';scaleButtons();scaleStatus('Complete');}else{scale.index++;tickScale(ticket);}},(scale.nextAt-ctx.currentTime)*1000);
  }
  $('sxFingerPlay').onclick=async()=>{
    const resume=scale.phase==='paused', index=resume?scale.index:0;
    stop();scale.index=index;scale.phase='playing';scaleButtons();scaleStatus(resume?'Resuming':'Starting');const ticket=generation;
    try{await ready();}catch(e){if(ticket===generation){scale.phase='idle';scaleButtons();$('sxFingerTransport').textContent=e.message;}return;}
    if(ticket!==generation)return;scale.nextAt=ctx.currentTime+.05;tickScale(ticket);
  };
  $('sxScalePause').onclick=()=>{const index=scale.index;stop();scale.index=index;scale.phase='paused';renderPath(true);scaleStatus('Paused — Resume repeats this note');};
  $('sxScaleStop').onclick=()=>{stop();scale.index=0;renderPath(true);scaleStatus('Stopped');};
  $('sxScalePrevious').onclick=()=>stepScale(Math.max(0,scale.index-1));
  $('sxScaleNext').onclick=()=>stepScale(Math.min(path().length-1,scale.index+1));
  chart();renderPath();
  const study=(p,b=1)=>({pitch:p,beats:b});
  const pieces={first:{info:'Original first-five study · two bars · B A G A | B (2 beats) G (2 beats).',notes:[study('B4'),study('A4'),study('G4'),study('A4'),study('B4',2),study('G4',2)]},ode:{info:'Beethoven, Symphony No. 9 theme (1824) · four bars · written C major · all quarter notes.',notes:['E4','E4','F4','G4','G4','F4','E4','D4','C4','C4','D4','E4','E4','D4','D4','D4'].map(n=>study(n))},breath:{info:'Original breathing study · two bars · B (2 beats) rest A | G (2 beats) rest rest.',notes:[study('B4',2),study(null),study('A4'),study('G4',2),study(null),study(null)]}};
  function renderPiece(){const piece=pieces[$('sxPiece').value];$('sxPieceInfo').textContent=piece.info;staff($('sxPieceStaff'),piece.notes,$('sxNames').checked);$('sxPieceNotes').replaceChildren();piece.notes.forEach(n=>{const b=document.createElement('button');b.type='button';b.textContent=`${n.pitch||'Rest'} · ${n.beats} beat${n.beats>1?'s':''}`;b.onclick=()=>{if(n.pitch)selectNote(n.pitch);play([n],null,false);};$('sxPieceNotes').append(b);});}
  const routes={C:[['C4','E4','G4'],['D4','F4','A4'],['G4','B4','D5']],G:[['G4','B4','D5'],['A4','C5','E5'],['D4','F♯4','A4']],F:[['F4','A4','C5'],['G4','B♭4','D5'],['C4','E4','G4']]};
  function routeNotes(){const chords=routes[$('sxRouteKey').value];return [chords[0],chords[1],chords[2],chords[0]].flatMap(c=>[study(c[0]),study(c[1]),study(c[2],2)]);}
  function renderRoute(){const chords=routes[$('sxRouteKey').value];$('sxRouteCards').innerHTML=chords.map((c,i)=>`<div class="sax-card"><h3>${['I · major','ii · minor','V · major'][i]}</h3><p>${c.join(' – ')}</p><p>Key degrees: ${['1 – 3 – 5','2 – 4 – 6','5 – 7 – 2'][i]}</p></div>`).join('');staff($('sxRouteStaff'),routeNotes());}
  const defaults=['B4','A4','G4',null,'G4','A4','B4',null], key='classroomos.saxophone.v1';let phrase=defaults.slice();
  try {const saved=JSON.parse(localStorage.getItem(key));if(saved?.phrase?.length===8&&saved.phrase.every(n=>[null,'E4','F4','G4','A4','B4'].includes(n)))phrase=saved.phrase;$('sxReflection').value=typeof saved?.reflection==='string'?saved.reflection:'';}catch(_){}
  function save(){try{localStorage.setItem(key,JSON.stringify({phrase,reflection:$('sxReflection').value}));$('sxComposeStatus').textContent='Saved in this browser.';}catch(_){$('sxComposeStatus').textContent='Storage unavailable. Your phrase works for this session.';}}
  function renderCompose(){staff($('sxComposeStaff'),phrase.map(n=>study(n)));}
  function buildComposer(){ $('sxComposer').replaceChildren();phrase.forEach((n,i)=>{const label=document.createElement('label');label.textContent=`Bar ${Math.floor(i/4)+1}, beat ${i%4+1} `;const s=document.createElement('select');[null,'E4','F4','G4','A4','B4'].forEach(p=>s.add(new Option(p||'Rest',p||'rest')));s.value=n||'rest';s.onchange=()=>{stop();phrase[i]=s.value==='rest'?null:s.value;renderCompose();save();};label.append(s);$('sxComposer').append(label);});renderCompose();}
  const questions=[['Why is a saxophone a woodwind?',['It has a wooden body','Its sound uses a single reed','Its bell is small'],1,'The reed and air column vibrate together; body material does not define this family.'],['What generally happens as more tone holes close?',['Effective air column lengthens and pitch lowers','Pitch always rises','The reed stops vibrating'],0,'A longer effective air column favors lower resonances.'],['Written C5 on alto sounds as…',['C5','B♭3','E♭4'],2,'Alto sounds a major sixth (9 semitones) below its written pitch.'],['Which notes belong to ii in written C major?',['D–F–A','D–F♯–A','C–E–G'],0,'ii starts on degree 2; its minor triad uses D, F and A.'],['What does a quarter rest mean in 4/4?',['Stop counting','One beat of measured silence','Play softly'],1,'Silence occupies a beat. Keep the pulse moving.']];
  $('sxQuiz').innerHTML=questions.map((q,i)=>`<fieldset><legend>${i+1}. ${q[0]}</legend>${q[1].map((a,j)=>`<label><input type="radio" name="sxq${i}" value="${j}"> ${a}</label>`).join('')}<p id="sxFeedback${i}"></p></fieldset>`).join('');
  $('sxCheck').onclick=()=>{let correct=0,answered=0;questions.forEach((q,i)=>{const selected=document.querySelector(`input[name="sxq${i}"]:checked`);if(selected)answered++;const ok=selected&&Number(selected.value)===q[2];if(ok)correct++;$(`sxFeedback${i}`).textContent=(ok?'Correct. ':selected?'Revisit this. ':'Choose an answer. ')+q[3];});$('sxQuizResult').textContent=`${correct} of ${questions.length} correct; ${answered} answered. Use the explanations, revise, and check again.`;};
  $('sxNote').onchange=()=>{stop();refreshVariants();showFingering();};$('sxInstrument').onchange=()=>{stop();showFingering();if(studioView==='scale'){scale.index=0;renderPath(true);scaleStatus('Ready');}};
  $('sxHearNote').onclick=()=>play([study(showFingering(),2)],null,false);
  $('sxCompare').onclick=()=>play(['B4','A4','G4'].map(n=>study(n)),null,false);
  $('sxPiece').onchange=()=>{stop();renderPiece();};$('sxNames').onchange=()=>{stop();renderPiece();};$('sxPlay').onclick=()=>play(pieces[$('sxPiece').value].notes,$('sxPieceStaff'));
  $('sxTempo').oninput=()=>{stop();$('sxTempoOut').textContent=$('sxTempo').value+' BPM';};
  $('sxArticulation').onchange=stop;$('sxDynamic').onchange=stop;
  $('sxRouteKey').onchange=()=>{stop();renderRoute();};$('sxRoutePlay').onclick=()=>play(routeNotes(),$('sxRouteStaff'));
  $('sxComposePlay').onclick=()=>play(phrase.map(n=>study(n)),$('sxComposeStaff'));
  $('sxComposeReset').onclick=()=>{stop();phrase=defaults.slice();buildComposer();save();};$('sxReflection').oninput=save;
  document.querySelectorAll('.sx-stop').forEach(b=>b.onclick=()=>{stop();if(studioView==='scale'){scale.index=0;renderPath(true);scaleStatus('Stopped');}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
  showFingering();renderPiece();renderRoute();buildComposer();
})();
