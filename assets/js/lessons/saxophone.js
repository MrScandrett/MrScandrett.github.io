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
  let ctx, nodes = [], timers = [], generation = 0;
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
    ctx ||= new Audio();
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
    osc.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
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
  function showFingering(reset=true) {
    const n=selected(), v=variant(), name=n[$('sxSpelling').value];
    if(reset)held=new Set(v.keys);
    const keys=[...held], concertMidi=n.midi+offsets[$('sxInstrument').value];
    const flatNames=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
    $('sxPitch').textContent=`Written ${name} → sounds ${flatNames[concertMidi%12]}${Math.floor(concertMidi/12)-1} · ${$('sxInstrument').selectedOptions[0].text}`;
    $('sxFingerDiagram').innerHTML=`<figure data-zoomable data-lightbox-group="sax-studio"><img alt="${name} fingering: ${keys.length?keys.join(', ')+' pressed':'all keys released'}" src="data:image/svg+xml,${encodeURIComponent(instrumentSVG(keys,name))}"><figcaption class="sx-diagram-caption">Written ${name}. Filled circles mark pressed touches; open circles mark released touches. Original ClassroomOS illustration based on YAS-280 references, with enlarged views of hidden keys.</figcaption></figure>`;
    $('sxKeyControls').innerHTML=F.keys.map(k=>`<button type="button" data-key="${k.id}" aria-pressed="${held.has(k.id)}" ${$('sxFingerMode').value==='explore'?'disabled':''}><span class="sax-dot ${held.has(k.id)?'closed':''}" aria-hidden="true"></span>${k.label}</button>`).join('');
    $('sxKeyControls').querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{const key=b.dataset.key;held.has(key)?held.delete(key):held.add(key);showFingering(false);$('sxKeyControls').querySelector(`[data-key="${key}"]`).focus();});
    const touchNames={L1:'index',L2:'middle',L3:'ring',R1:'index',R2:'middle',R3:'ring',bis:'bis B♭',Gsharp:'G♯',lowCsharp:'low C♯',lowB:'low B',lowBflat:'low B♭',sideBflat:'side B♭',lowC:'low C',Eflat:'E♭'};
    const left=keys.filter(k=>['L1','L2','L3','bis','Gsharp','lowCsharp','lowB','lowBflat'].includes(k)).map(k=>touchNames[k]);
    const right=keys.filter(k=>['R1','R2','R3','sideBflat','lowC','Eflat'].includes(k)).map(k=>touchNames[k]);
    $('sxFingerText').textContent=keys.length?`Press — Left: ${left.join(', ')||'none'}. Right: ${right.join(', ')||'none'}.${held.has('octave')?' Add left-thumb octave key.':''}`:'Release all keys. Keep both hands close to the instrument.';
    $('sxFingerTip').textContent=v.tip;
    const building=studioView==='note'&&$('sxFingerMode').value!=='explore';
    $('sxBuildTools').hidden=!building;
    $('sxKeyControls').hidden=!building;
    $('sxFingerText').classList.toggle('sx-visible-reading',!building);
    $('sxFingerResult').textContent='';
    staff($('sxNoteStaff'),[{pitch:name,beats:1}]);

    return name;
  }
  function selectNote(name){const n=F.notes.find(n=>n.flat===name||n.sharp===name);if(!n)return;$('sxNote').value=n.midi;refreshVariants();showFingering();}
  function chart(){
    const range=$('sxRange').value;
    const notes=F.notes.filter(n=>range==='first'?[64,65,67,69,71].includes(n.midi):range==='natural'?n.midi>=60&&n.flat===n.sharp:true);
    $('sxChart').innerHTML=notes.map(n=>`<figure data-zoomable data-lightbox-group="sax-fingerings"><div id="sxStaff${n.midi}"></div><img alt="${n[$('sxSpelling').value]} saxophone fingering" src="data:image/svg+xml,${encodeURIComponent(instrumentSVG(n.variants[0].keys,n.flat).replaceAll('var(--bg, white)','white'))}"><figcaption><strong>${n[$('sxSpelling').value]}</strong> · ${n.variants[0].tip} Diagram: ClassroomOS, original illustration based on YAS-280 reference photographs; enlarged detail views.</figcaption></figure>`).join('');
    notes.forEach(n=>staff($('sxStaff'+n.midi),[{pitch:n[$('sxSpelling').value],beats:1}]));
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
