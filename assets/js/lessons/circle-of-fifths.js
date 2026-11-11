(() => {
  'use strict';
  // Spell scales by key, rather than substituting enharmonic pitch names.
  const keys = [
    ['C','A',0,'C D E F G A B',0], ['G','E',1,'G A B C D E F♯',7],
    ['D','B',2,'D E F♯ G A B C♯',2], ['A','F♯',3,'A B C♯ D E F♯ G♯',9],
    ['E','C♯',4,'E F♯ G♯ A B C♯ D♯',4], ['B','G♯',5,'B C♯ D♯ E F♯ G♯ A♯',11],
    ['F♯','D♯',6,'F♯ G♯ A♯ B C♯ D♯ E♯',6], ['D♭','B♭',-5,'D♭ E♭ F G♭ A♭ B♭ C',1],
    ['A♭','F',-4,'A♭ B♭ C D♭ E♭ F G',8], ['E♭','C',-3,'E♭ F G A♭ B♭ C D',3],
    ['B♭','G',-2,'B♭ C D E♭ F G A',10], ['F','D',-1,'F G A B♭ C D E',5]
  ];
  const flatSix = ['G♭','E♭',-6,'G♭ A♭ B♭ C♭ D♭ E♭ F',6];
  const colors = ['#dfe6c9','#d4e2c8','#cde0d5','#cddfe0','#d1dce4','#d9d8e6','#e3d5e2','#ead6dc','#ecd8cf','#eadfc9','#e6e2c7','#e1e5c8'];
  const major = [0,2,4,5,7,9,11,12];
  const patterns = { home:[0,3,4,0], pop:[0,4,5,3], turn:[1,4,0] };
  const hints = {home:'Home → wander → build tension → land.',pop:'A familiar loop: home → tension → minor → open space.',turn:'A minor chord → tension → home. A classic landing.'};
  const degrees = ['I','ii','iii','IV','V','vi','vii°'];
  const modes=[
    {name:'Ionian',formula:'1 2 3 4 5 6 7',detail:'Major: listen for the stable major third and major seventh.'},
    {name:'Dorian',formula:'1 2 ♭3 4 5 6 ♭7',detail:'Minor with a raised sixth compared with natural minor.'},
    {name:'Phrygian',formula:'1 ♭2 ♭3 4 5 ♭6 ♭7',detail:'Minor with a lowered second, only a semitone above home.'},
    {name:'Lydian',formula:'1 2 3 ♯4 5 6 7',detail:'Major with a raised fourth: listen for its lift above home.'},
    {name:'Mixolydian',formula:'1 2 3 4 5 6 ♭7',detail:'Major with a lowered seventh, softening the pull back to home.'},
    {name:'Aeolian',formula:'1 2 ♭3 4 5 ♭6 ♭7',detail:'Natural minor: a minor third, sixth, and seventh.'},
    {name:'Locrian',formula:'1 ♭2 ♭3 4 ♭5 ♭6 ♭7',detail:'The lowered fifth gives its tonic triad a diminished, unsettled quality.'}
  ];
  let activeMode=0;
  let diagramDegree=0;
  let customJourney=[0,5,3,4];
  const pattern=()=>document.getElementById('progression').value==='custom'?customJourney:patterns[document.getElementById('progression').value];
  const pitch=note=>({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[note[0]]+(note.includes('♯')?1:note.includes('♭')?-1:0)+12)%12;
  let selected=0, useFlatSix=false, context, voices=[], timers=[], generation=0;
  const circle=document.getElementById('fifths-circle');
  const status=document.getElementById('audio-status');
  const current=()=>selected===6 && useFlatSix ? flatSix : keys[selected];
  const buttons=[];
  const ns='http://www.w3.org/2000/svg';
  const diagram=circle.querySelector('svg');
  diagram.setAttribute('viewBox','0 0 600 600');diagram.replaceChildren();
  const wheelColors=['#ef8275','#f5aa65','#f4ce69','#e8dc77','#b7d878','#81c9a0','#79c8cf','#91b9e5','#b19bda','#cb9acb','#e5a3c0','#efb3cb'];
  const polar=(angle,r)=>{const a=(angle-90)*Math.PI/180;return [300+r*Math.cos(a),300+r*Math.sin(a)];};
  function svg(tag,attrs,parent=diagram){const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));parent.append(el);return el;}
  function sector(i,inner,outer){
    const start=i*30-15,end=i*30+15,a=polar(start,outer),b=polar(end,outer),c=polar(end,inner),d=polar(start,inner);
    return `M ${a} A ${outer} ${outer} 0 0 1 ${b} L ${c} A ${inner} ${inner} 0 0 0 ${d} Z`;
  }
  keys.forEach((key,i)=>{
    const group=svg('g',{'class':'wheel-sector','data-sector':i});
    svg('path',{d:sector(i,150,216),style:'fill:'+wheelColors[i],'class':'wheel-major'},group);
    svg('path',{d:sector(i,32,150),style:'fill:'+wheelColors[(i+2)%12],'class':'wheel-minor'},group);
    const button=document.createElement('button');button.type='button';button.className='wheel-key';
    const outline=[];
    for(let a=i*30-15;a<=i*30+15;a+=3)outline.push(polar(a,216).map(v=>v/6+'%').join(' '));
    for(let a=i*30+15;a>=i*30-15;a-=3)outline.push(polar(a,32).map(v=>v/6+'%').join(' '));
    button.style.clipPath=`polygon(${outline.join(',')})`;
    button.innerHTML=`<span class="key-role"></span><strong>${key[0]}</strong><small>${key[1]}m</small>`;
    [[button.querySelector('strong'),178],[button.querySelector('small'),117],[button.querySelector('.key-role'),205]].forEach(([el,r])=>{
      const [x,y]=polar(i*30,r);el.style.left=x/6+'%';el.style.top=y/6+'%';
    });
    button.setAttribute('aria-label',`${i===6?'F sharp or G flat':key[0]} major, relative ${key[1]} minor`);
    button.title='Select a key; use arrow keys to move around the circle';
    button.addEventListener('click',()=>select(i,true));
    button.addEventListener('mouseenter',()=>group.classList.add('wheel-hover'));
    button.addEventListener('mouseleave',()=>group.classList.remove('wheel-hover'));
    button.addEventListener('focus',()=>group.classList.add('wheel-focus'));
    button.addEventListener('blur',()=>group.classList.remove('wheel-focus'));
    circle.append(button);buttons.push(button);
    // Treble-clef signatures, with accidentals at their staff positions.
    const [cx,cy]=polar(i*30,261),staff=svg('g',{'class':'wheel-signature','transform':`translate(${cx-34},${cy-7})`});
    for(let line=0;line<5;line++)svg('line',{x1:0,x2:68,y1:line*3.4,y2:line*3.4},staff);
    const clef=svg('g',{},staff);clef.innerHTML=MusicNotation.clef('treble',1,13.6,1.7);
    const count=key[2];
    const accidentals=svg('g',{'class':'staff-accidentals'},staff);
    paintAccidentals(accidentals,count,18,6.5,13.6,1.7);
    const label=svg('text',{x:34,y:32,'class':'signature-count'},staff);label.textContent=count===0?'no ♯ or ♭':Math.abs(count)+(count>0?' ♯':' ♭');
  });
  function paintAccidentals(host,count,x,gap,bottom,halfSpace){
    const positions=MusicNotation.clefs.treble[count>0?'sharp':'flat'];
    host.innerHTML=positions.slice(0,Math.abs(count)).map((step,i)=>MusicNotation.accidental(count>0?1:-1,x+i*gap,bottom-step*halfSpace,halfSpace*2)).join('');
  }
  function renderSignature(count,name){
    const staff=document.getElementById('signature-staff');staff.replaceChildren();
    const names=(count>0?'F C G D A E B':'B E A D G C F').split(' ').slice(0,Math.abs(count)).map(n=>n+(count>0?'♯':'♭'));
    const title=svg('title',{id:'signature-staff-title'},staff);
    title.textContent=name+' major: '+(count?names.join(', '):'no sharps or flats')+' in treble clef';
    for(let line=0;line<5;line++)svg('line',{x1:16,x2:404,y1:40+line*16,y2:40+line*16},staff);
    const clef=svg('g',{},staff);clef.innerHTML=MusicNotation.clef('treble',25,104,8);
    const marks=svg('g',{},staff);paintAccidentals(marks,count,100,38,104,8);
    document.getElementById('signature-reading').textContent=count?`${Math.abs(count)} ${count>0?'sharps':'flats'}: apply these to every octave, unless an accidental changes a note.`:'No sharps or flats in the signature. All seven notes are natural.';
    const labels=document.getElementById('signature-note-names');labels.replaceChildren();
    names.forEach(note=>{const chip=document.createElement('span');chip.textContent=note;labels.append(chip);});
  }
  function stop(announce=true){
    generation++;timers.forEach(clearTimeout);timers=[];
    voices.forEach(v=>{try{v.kill(context.currentTime);}catch{}});voices=[];
    document.querySelectorAll('.is-playing').forEach(el=>el.classList.remove('is-playing'));
    if(announce)status.textContent='Stopped. Pick a note or try another key.';
  }
  function chord(degree){
    const notes=current()[3].split(' '),root=60+current()[4];
    const semitones=degree===6?[0,3,6]:[0,degree===1||degree===2||degree===5?3:4,7];
    return {name:notes[degree]+(degree===6?'dim':degree===1||degree===2||degree===5?'m':''),midi:semitones.map(n=>root+major[degree]+n)};
  }
  // Frets run from low E to high e. Prefer familiar open shapes; otherwise
  // transpose E/A barre shapes, or the movable A-string diminished triad.
  const guitarTuning=[40,45,50,55,59,64];
  const openShapes={
    '0:major':[-1,3,2,0,1,0], '2:major':[-1,-1,0,2,3,2],
    '4:major':[0,2,2,1,0,0], '5:major':[1,3,3,2,1,1],
    '7:major':[3,2,0,0,0,3], '9:major':[-1,0,2,2,2,0],
    '2:minor':[-1,-1,0,2,3,1], '4:minor':[0,2,2,0,0,0],
    '9:minor':[-1,0,2,2,1,0]
  };
  function guitarShape(degree){
    const root=chord(degree).midi[0]%12,quality=degree===6?'dim':[1,2,5].includes(degree)?'minor':'major';
    if(openShapes[root+':'+quality])return openShapes[root+':'+quality];
    const a=(root-9+12)%12,e=(root-4+12)%12;
    if(quality==='dim')return [-1,a,a+1,a+2,a+1,-1];
    return e<=a?[e,e+2,e+2,e+(quality==='minor'?0:1),e,e]:[-1,a,a+2,a+2,a+(quality==='minor'?1:2),a];
  }
  function renderChordDiagrams(){
    const degree=diagramDegree,c=chord(degree),scale=current()[3].split(' '),names=[0,2,4].map(n=>scale[(degree+n)%7]);
    const chooser=document.getElementById('diagram-chord');chooser.replaceChildren();
    degrees.forEach((d,i)=>{const option=document.createElement('option');option.value=i;option.textContent=d+' · '+chord(i).name;chooser.append(option);});chooser.value=degree;
    document.getElementById('diagram-summary').textContent=`${c.name} · ${degrees[degree]} in ${current()[0]} major · ${names.join(' – ')}`;
    const piano=document.getElementById('chord-piano');piano.replaceChildren();
    const pianoTitle=svg('title',{},piano);pianoTitle.textContent=`${c.name} piano: ${names.join(', ')}; root position, colored keys sound together.`;
    const start=12*Math.floor(c.midi[0]/12),white=[0,2,4,5,7,9,11],whiteMidi=[];
    for(let midi=start;midi<=start+24;midi++)if(white.includes(midi%12))whiteMidi.push(midi);
    const width=420/whiteMidi.length;
    function key(midi,x,w,h,black){
      const index=c.midi.indexOf(midi),active=index>=0;
      svg('rect',{x,y:1,width:w,height:h,rx:2,fill:active?'#ceef9c':black?'#182c43':'#fffdf7',stroke:'#182c43','stroke-width':1},piano);
      if(active){
        const label=svg('text',{x:x+w/2,y:h-20,'text-anchor':'middle',fill:'#182c43','font-size':black?11:13,'font-weight':700},piano);label.textContent=names[index];
        const role=svg('text',{x:x+w/2,y:h-5,'text-anchor':'middle',fill:'#182c43','font-size':10},piano);role.textContent=index===0?'R':index===1?'3':'5';
      }
    }
    whiteMidi.forEach((m,i)=>key(m,i*width,width,156,false));
    whiteMidi.forEach((m,i)=>{if([0,2,5,7,9].includes(m%12)&&m<start+24)key(m+1,(i+1)*width-width*.31,width*.62,96,true);});
    const frets=guitarShape(degree),positive=frets.filter(f=>f>0),first=Math.min(...positive)>1?Math.min(...positive):1;
    const guitar=document.getElementById('chord-guitar');guitar.replaceChildren();
    const fretText=frets.map(f=>f<0?'×':f).join(' · ');
    const guitarTitle=svg('title',{},guitar);guitarTitle.textContent=`${c.name} guitar, low E to high e: ${frets.map(f=>f<0?'muted':f===0?'open':'fret '+f).join(', ')}.`;
    for(let f=0;f<=4;f++)svg('line',{x1:45,x2:195,y1:50+f*36,y2:50+f*36,stroke:'#182c43','stroke-width':f===0&&first===1?5:1},guitar);
    const fretLabel=svg('text',{x:10,y:75,fill:'#182c43','font-size':13},guitar);fretLabel.textContent=first+'fr';
    frets.forEach((f,i)=>{
      const x=45+i*30;
      svg('line',{x1:x,x2:x,y1:50,y2:194,stroke:'#182c43'},guitar);
      const marker=svg('text',{x,y:32,'text-anchor':'middle',fill:'#182c43','font-size':18},guitar);marker.textContent=f<0?'×':f===0?'○':'';
      if(f>0){
        svg('circle',{cx:x,cy:50+(f-first+.5)*36,r:11,fill:'#182c43'},guitar);
        const dot=svg('text',{x,y:54+(f-first+.5)*36,'text-anchor':'middle',fill:'#fffdf7','font-size':11},guitar);dot.textContent=(guitarTuning[i]+f)%12===c.midi[0]%12?'R':'';
      }
      const label=svg('text',{x,y:220,'text-anchor':'middle',fill:'#182c43','font-size':13},guitar);label.textContent=['E','A','D','G','B','e'][i];
    });
    document.getElementById('guitar-frets').textContent='Frets, low → high: '+fretText+'. R = root.';
  }
  function showChord(degree){diagramDegree=degree;renderChordDiagrams();}
  document.getElementById('diagram-chord').addEventListener('change',e=>{stop(false);showChord(Number(e.target.value));});
  document.getElementById('hear-piano-chord').addEventListener('click',()=>sound([[0,chord(diagramDegree).midi,1]],chord(diagramDegree).name+' on piano','piano'));
  document.getElementById('hear-guitar-chord').addEventListener('click',()=>sound([[0,guitarShape(diagramDegree).flatMap((f,i)=>f<0?[]:[guitarTuning[i]+f]),1.5]],chord(diagramDegree).name+' on guitar','pluck'));
  function renderChords(){
    const journey=pattern();
    const path=document.getElementById('chord-path');path.replaceChildren();
    journey.forEach((degree,i)=>{
      const c=chord(degree),button=document.createElement('button');button.type='button';button.className='chord-pad';button.dataset.degree=degree;
      button.style.setProperty('--pad-color',degree===0?'var(--home)':degree===3?'var(--away)':degree===4?'var(--pull)':'#e5d6f7');
      button.innerHTML=`<strong>${c.name}</strong><span>${degrees[degree]} · ${degree===0?'home':degree===3?'explore':degree===4?'pull':degree===6?'diminished':'minor'}</span>`;
      button.setAttribute('aria-label',`Play ${c.name}, chord ${i+1}`);
      button.addEventListener('click',()=>{showChord(degree);sound([[0,c.midi,.7,[button]]],`${c.name} chord`);});path.append(button);
    });
    document.getElementById('progression-hint').textContent=document.getElementById('progression').value==='custom'?'Your composition. Change keys to hear it transposed.':hints[document.getElementById('progression').value];
    if(!journey.length)path.textContent='Add chords in the builder below to start your journey.';
  }
  function select(index,audition=false){
    const old=current()[3].split(' '),oldName=current()[0],previous=selected;
    stop(false);selected=(index+12)%12;
    const [name,minor,count,scale]=current(),notes=scale.split(' ');
    document.getElementById('center-key').textContent=name;
    buttons[6].querySelector('strong').textContent=useFlatSix?'G♭':'F♯';
    buttons[6].querySelector('small').textContent=useFlatSix?'E♭m':'D♯m';
    const signature=diagram.querySelectorAll('.wheel-signature')[6];
    signature.querySelector('.signature-count').textContent=useFlatSix?'6 ♭':'6 ♯';
    paintAccidentals(signature.querySelector('.staff-accidentals'),useFlatSix?-6:6,18,6.5,13.6,1.7);
    renderSignature(count,name);
    document.getElementById('key-detail').innerHTML=`<div class="key-heading"><div><p class="eyebrow">YOUR MUSICAL HOME</p><h2>${name} major</h2></div><div class="signature-badge"><strong>${count===0?'♮':Math.abs(count)+(count>0?' ♯':' ♭')}</strong>${count===0?'all natural':count>0?'sharps':'flats'}</div></div><p>${count===0?'No sharps or flats. Start with these seven notes.':`Use ${(count>0?'F C G D A E B':'B E A D G C F').split(' ').slice(0,Math.abs(count)).map(n=>n+(count>0?'♯':'♭')).join(' · ')} in this key.`}${selected===6?' <button type="button" id="switch-spelling">Spell as '+(useFlatSix?'F♯':'G♭')+'</button>':''}</p>`;
    document.getElementById('switch-spelling')?.addEventListener('click',()=>{useFlatSix=!useFlatSix;select(6);document.getElementById('switch-spelling').focus();});
    document.getElementById('minor-title').textContent=minor+' minor';
    buttons.forEach((b,i)=>{
      const role=i===selected?'home':i===(selected+11)%12?'explore':i===(selected+1)%12?'pull':'';
      b.setAttribute('aria-pressed',String(i===selected));
      b.querySelector('.key-role').textContent=role==='home'?'I':role==='explore'?'IV':role==='pull'?'V':'';
      diagram.querySelector(`[data-sector="${i}"]`).classList.toggle('wheel-selected',i===selected);
    });
    const changed=previous!==selected?notes.filter(n=>!old.some(o=>pitch(o)===pitch(n))):[];
    const palette=document.getElementById('note-palette');palette.replaceChildren();
    [...notes,notes[0]].forEach((note,i)=>{
      const button=document.createElement('button');button.type='button';button.className=(i===0||i===7?'tonic ':'')+(/[♯♭]/.test(note)?'accidental':'');
      const isNew=changed.length===1&&changed.includes(note);
      if(isNew)button.classList.add('changed-note');
      button.innerHTML=`${note}<span>${isNew?'new':i===7?'home':i+1}</span>`;button.setAttribute('aria-label',`Play ${note}, ${i===7?'octave': 'degree '+(i+1)}`);
      button.addEventListener('click',()=>sound([[0,[60+current()[4]+major[i]],.45,[button]]],`${note} · ${i===0||i===7?'home note':'scale degree '+(i+1)}`));palette.append(button);
    });
    renderChords();renderComposer();renderModes();renderChordDiagrams();
    if(previous!==selected){const changes=notes.filter(n=>!old.some(o=>pitch(o)===pitch(n)));const removed=old.filter(n=>!notes.some(o=>pitch(o)===pitch(n)));document.getElementById('move-insight').textContent=`${oldName} → ${name}: ${changes.length===1?'six notes stay. '+removed[0]+' becomes '+changes[0]+'.': 'New palette: '+changes.join(', ')+'.'} Try the same chord journey here.`;}
    status.textContent=`${name} major is ready. Tap a note or play a chord journey.`;
    if(audition&&document.getElementById('tap-sound').checked)sound([[0,chord(0).midi,.6,[buttons[selected]]]],`${name} major · home chord`);
  }
  async function sound(events,label,instrumentOverride){
    stop(false);const token=generation;
    try{
      context=AudioKit.context();if(!context)throw new Error('No audio');
      AudioKit.setVolume(Number(document.getElementById('fifths-volume').value)/100);await AudioKit.resume();
      const instrument=instrumentOverride||document.getElementById('fifths-instrument').value;
      status.textContent='Loading '+instrument+' samples…';
      await MusicSynth.prepare(context,[{instrument,pitches:[...new Set(events.flatMap(e=>e[1]))]}]);
      if(token!==generation)return;
      const startTime=context.currentTime+.06;
      events.forEach(([offset,notes,length,elements=[]])=>{
        notes.forEach((midi,n)=>{
          const voice=AudioKit.note({instrument,midi,velocity:notes.length>1?.62:.8,at:startTime+offset+(notes.length>1?n*.012:0),duration:length});
          if(voice)voices.push(voice);
        });
        timers.push(setTimeout(()=>{if(token===generation){const pad=elements.find(e=>e?.dataset.degree!==undefined);if(pad)showChord(Number(pad.dataset.degree));}if(token===generation)elements.forEach(e=>{e.classList.add('is-playing');if(e.classList.contains('wheel-key'))diagram.querySelector(`[data-sector="${buttons.indexOf(e)}"]`).classList.add('is-playing');});},(offset+.1)*1000));
        timers.push(setTimeout(()=>{if(token===generation)elements.forEach(e=>{e.classList.remove('is-playing');if(e.classList.contains('wheel-key'))diagram.querySelector(`[data-sector="${buttons.indexOf(e)}"]`).classList.remove('is-playing');});},(offset+length+.1)*1000));
      });
      const end=Math.max(...events.map(e=>e[0]+e[2]));timers.push(setTimeout(()=>{if(token===generation)status.textContent='Your turn. Change the key or try another sound.';},(end+.1)*1000));
      status.textContent='Playing: '+label;
    }catch(error){console.error('Circle audio:',error);stop(false);status.textContent='Audio is unavailable. Follow the colored notes and chord names instead.';}
  }
  function play(mode){
    const root=60+current()[4],tiles=[...document.querySelectorAll('#note-palette button')];
    if(mode==='chords'){
      const journey=pattern(),beat=60/Number(document.getElementById('fifths-tempo').value),pads=[...document.querySelectorAll('.chord-pad')];
      if(!journey.length){stop(false);status.textContent='Add a chord in the builder before playing.';return;}
      sound(journey.map((d,i)=>[i*beat,chord(d).midi,beat*.88,[pads[i],...(document.getElementById('progression').value==='custom'?[document.querySelectorAll('#custom-journey button')[i]]:[]),...(d===0?[buttons[selected]]:d===3?[buttons[(selected+11)%12]]:d===4?[buttons[(selected+1)%12]]:[])]]),current()[0]+' · '+journey.map(d=>chord(d).name).join(' → '));
    }else{
      const intervals=mode==='fifth'?[0,7]:mode==='minor'?[0,2,3,5,7,8,10,12]:major;
      const tonic=mode==='minor'?root-3:root;
      sound(intervals.map((n,i)=>[i*.38,[tonic+n],.34,[tiles[mode==='minor'?(i+5)%7:mode==='fifth'?i*4:i]]]),mode==='minor'?current()[1]+' natural minor':current()[0]+(mode==='fifth'?' → perfect fifth':' major scale'));
    }
  }
  function renderModes(){
    const table=document.getElementById('modes-matrix');table.replaceChildren();
    const caption=document.createElement('caption');caption.textContent='Seven modes for every key signature';table.append(caption);
    const head=table.createTHead().insertRow();
    const corner=document.createElement('th');corner.scope='col';corner.textContent='Mode / signature';head.append(corner);
    keys.forEach((original,i)=>{
      const k=i===6&&useFlatSix?flatSix:original,th=document.createElement('th');th.scope='col';
      th.textContent=(k[2]===0?'0':Math.abs(k[2])+(k[2]>0?' ♯':' ♭'))+' · '+k[0];
      th.classList.toggle('active-signature',i===selected);head.append(th);
    });
    const body=table.createTBody();
    modes.forEach((mode,d)=>{
      const row=body.insertRow(),label=document.createElement('th');label.scope='row';label.textContent=mode.name;row.append(label);
      keys.forEach((original,i)=>{
        const k=i===6&&useFlatSix?flatSix:original,note=k[3].split(' ')[d],cell=row.insertCell(),button=document.createElement('button');button.type='button';button.textContent=note;
        button.setAttribute('aria-label',`${note} ${mode.name}, notes of ${k[0]} major`);
        button.setAttribute('aria-pressed',String(i===selected&&d===activeMode));
        cell.classList.toggle('active-signature',i===selected);
        button.addEventListener('click',()=>{activeMode=d;select(i);document.querySelectorAll('#modes-matrix tbody tr')[d].querySelectorAll('button')[i].focus({preventScroll:true});});cell.append(button);
      });
    });
    const notes=current()[3].split(' '),rotated=[...notes.slice(activeMode),...notes.slice(0,activeMode),notes[activeMode]],mode=modes[activeMode];
    document.getElementById('mode-name').textContent=notes[activeMode]+' '+mode.name;
    document.getElementById('mode-notes').textContent=rotated.join(' · ');
    document.getElementById('mode-formula').textContent='Formula from this tonic: '+mode.formula;
    document.getElementById('mode-context').textContent=mode.detail+' Shares all seven notes with '+current()[0]+' major.';
    const link=document.getElementById('mode-lesson-link'),tonic=60+pitch(notes[activeMode]);
    link.href='music-modes-evolution.html?mode='+mode.name+'&tonic='+tonic+'&spelling='+encodeURIComponent(notes[activeMode])+'#modern';
  }
  document.getElementById('toggle-modes').addEventListener('click',e=>{
    const open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));
    e.currentTarget.textContent=open?'Close modes':'Explore modes';document.getElementById('modes-explorer').hidden=!open;
  });
  document.getElementById('hear-mode').addEventListener('click',()=>{
    const root=60+current()[4]+major[activeMode],intervals=Array.from({length:8},(_,i)=>{
      const step=i+activeMode;return major[step%7]+12*Math.floor(step/7)-major[activeMode];
    });
    sound([[0,[root-12],3.8],...intervals.map((n,i)=>[i*.45,[root+n],.4])],document.getElementById('mode-name').textContent+' over its tonic');
  });
  function renderComposer(){
    const bank=document.getElementById('chord-bank');bank.replaceChildren();
    degrees.forEach((degree,i)=>{
      const c=chord(i),button=document.createElement('button');button.type='button';
      button.innerHTML=`<strong>${c.name}</strong><span>${degree}</span>`;
      button.setAttribute('aria-label',`Add ${c.name}, ${degree}, to your journey`);
      button.disabled=customJourney.length>=8;
      button.addEventListener('click',()=>{
        stop(false);showChord(i);customJourney.push(i);document.getElementById('progression').value='custom';renderChords();renderComposer();
        document.getElementById('composer-status').textContent=`Added ${c.name}. ${customJourney.length} of 8 steps.`;
        (customJourney.length===8?document.getElementById('undo-chord'):document.querySelectorAll('#chord-bank button')[i]).focus();
        sound([[0,c.midi,.6]],`Added ${c.name}`);
      });bank.append(button);
    });
    const list=document.getElementById('custom-journey');list.replaceChildren();
    customJourney.forEach((d,i)=>{
      const item=document.createElement('li'),button=document.createElement('button');button.type='button';
      button.dataset.degree=d;
      button.innerHTML=`<small>${i+1}</small><strong>${chord(d).name}</strong><span>${degrees[d]}</span>`;
      button.setAttribute('aria-label',`Hear step ${i+1}: ${chord(d).name}`);
      button.addEventListener('click',()=>{showChord(d);sound([[0,chord(d).midi,.7,[button]]],`Step ${i+1}: ${chord(d).name}`);});item.append(button);list.append(item);
    });
    if(!customJourney.length){const item=document.createElement('li');item.className='journey-empty';item.textContent='Your next song starts with one chord. Choose one above.';list.append(item);}
    document.getElementById('undo-chord').disabled=!customJourney.length;
    document.getElementById('clear-chords').disabled=!customJourney.length;
    document.getElementById('play-custom').disabled=!customJourney.length;
  }
  document.getElementById('play-custom').addEventListener('click',()=>{document.getElementById('progression').value='custom';renderChords();play('chords');});
  ['undo-chord','clear-chords'].forEach(id=>document.getElementById(id).addEventListener('click',()=>{
    stop(false);if(id==='undo-chord')customJourney.pop();else customJourney=[];
    renderChords();renderComposer();if(!customJourney.length)document.querySelector('#chord-bank button').focus();document.getElementById('composer-status').textContent=customJourney.length?`${customJourney.length} of 8 steps. Ready to play.`:'Journey cleared. Choose a chord above.';
  }));
  document.getElementById('fifths-tempo').addEventListener('input',e=>{document.getElementById('tempo-value').value=e.target.value+' BPM';stop(false);status.textContent='Tempo changed. Press Play to hear the new speed.';});
  document.getElementById('fifths-volume').addEventListener('input',e=>AudioKit.setVolume(Number(e.target.value)/100));
  circle.addEventListener('keydown',e=>{
    if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(e.key)||e.altKey||e.ctrlKey||e.metaKey)return;
    e.preventDefault();select(e.key==='Home'?0:e.key==='End'?11:selected+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1),true);buttons[selected].focus();
  });
  document.getElementById('previous-key').addEventListener('click',()=>select(selected-1,true));
  document.getElementById('next-key').addEventListener('click',()=>select(selected+1,true));
  document.getElementById('progression').addEventListener('change',()=>{stop();renderChords();});
  document.querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',()=>play(b.dataset.play)));
  document.getElementById('play-progression').addEventListener('click',()=>play('chords'));
  document.getElementById('stop-audio').addEventListener('click',()=>stop());
  document.getElementById('shuffle-key').addEventListener('click',()=>select(selected+1+Math.floor(Math.random()*11),true));
  document.getElementById('discover-neighbor').addEventListener('click',()=>select(selected+1,true));
  document.getElementById('discover-home').addEventListener('click',()=>{document.getElementById('progression').value='home';renderChords();play('chords');});
  document.getElementById('discover-minor').addEventListener('click',()=>play('minor'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  select(0);
})();
