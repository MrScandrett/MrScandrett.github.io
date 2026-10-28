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
  let selected=0, useFlatSix=false, context, voices=[], timers=[], generation=0;
  const circle=document.getElementById('fifths-circle');
  const status=document.getElementById('audio-status');
  const current=()=>selected===6 && useFlatSix ? flatSix : keys[selected];
  const buttons=[];
  const point=i=>{const a=i*Math.PI/6-Math.PI/2;return [50+41*Math.cos(a),50+41*Math.sin(a)];};
  keys.forEach((key,i)=>{
    const button=document.createElement('button');button.type='button';
    const [x,y]=point(i);button.style.left=`${x}%`;button.style.top=`${y}%`;button.style.setProperty('--key-color',colors[i]);
    button.innerHTML=`<span class="key-role"></span><strong>${i===6?'F♯/G♭':key[0]}</strong><small>${i===6?'D♯m/E♭m':key[1]+'m'}</small>`;
    button.setAttribute('aria-label',`${i===6?'F sharp or G flat':key[0]} major`);
    button.addEventListener('click',()=>select(i,true));circle.append(button);buttons.push(button);
  });
  function stop(announce=true){
    generation++;timers.forEach(clearTimeout);timers=[];
    voices.forEach(v=>{try{v.stop();}catch{}});voices=[];
    document.querySelectorAll('.is-playing').forEach(el=>el.classList.remove('is-playing'));
    if(announce)status.textContent='Stopped. Pick a note or try another key.';
  }
  function chord(degree){
    const notes=current()[3].split(' '),root=60+current()[4];
    const semitones=degree===6?[0,3,6]:[0,degree===1||degree===2||degree===5?3:4,7];
    return {name:notes[degree]+(degree===6?'dim':degree===1||degree===2||degree===5?'m':''),midi:semitones.map(n=>root+major[degree]+n)};
  }
  function renderChords(){
    const pattern=patterns[document.getElementById('progression').value];
    const path=document.getElementById('chord-path');path.replaceChildren();
    pattern.forEach((degree,i)=>{
      const c=chord(degree),button=document.createElement('button');button.type='button';button.className='chord-pad';
      button.style.setProperty('--pad-color',degree===0?'var(--home)':degree===3?'var(--away)':degree===4?'var(--pull)':'#e5d6f7');
      button.innerHTML=`<strong>${c.name}</strong><span>${degrees[degree]} · ${degree===0?'home':degree===3?'explore':degree===4?'pull':'minor'}</span>`;
      button.setAttribute('aria-label',`Play ${c.name}, chord ${i+1}`);
      button.addEventListener('click',()=>sound([[0,c.midi,.7,[button]]],`${c.name} chord`));path.append(button);
    });
    document.getElementById('progression-hint').textContent=hints[document.getElementById('progression').value];
  }
  function select(index,audition=false){
    const old=current()[3].split(' '),oldName=current()[0],previous=selected;
    stop(false);selected=(index+12)%12;
    const [name,minor,count,scale]=current(),notes=scale.split(' ');
    document.getElementById('center-key').textContent=name;
    document.getElementById('key-detail').innerHTML=`<div class="key-heading"><div><p class="eyebrow">YOUR MUSICAL HOME</p><h2>${name} major</h2></div><div class="signature-badge"><strong>${count===0?'♮':Math.abs(count)+(count>0?' ♯':' ♭')}</strong>${count===0?'all natural':count>0?'sharps':'flats'}</div></div><p>${count===0?'No sharps or flats. Start with these seven notes.':`Use ${notes.filter(n=>/[♯♭]/.test(n)).join(' · ')} in this key.`}${selected===6?' <button type="button" id="switch-spelling">Spell as '+(useFlatSix?'F♯':'G♭')+'</button>':''}</p>`;
    document.getElementById('switch-spelling')?.addEventListener('click',()=>{useFlatSix=!useFlatSix;select(6);});
    document.getElementById('minor-title').textContent=minor+' minor';
    buttons.forEach((b,i)=>{const role=i===selected?'home':i===(selected+11)%12?'explore':i===(selected+1)%12?'pull':'';b.setAttribute('aria-pressed',String(i===selected));b.classList.toggle('is-neighbor',role==='explore'||role==='pull');b.querySelector('.key-role').textContent=role;b.style.setProperty('--key-color',role==='home'?'var(--home)':role==='explore'?'var(--away)':role==='pull'?'var(--pull)':colors[i]);});
    const left=point((selected+11)%12),home=point(selected),right=point((selected+1)%12);
    document.getElementById('neighbor-path').setAttribute('d',`M ${left[0]*5} ${left[1]*5} Q 250 250 ${home[0]*5} ${home[1]*5} Q 250 250 ${right[0]*5} ${right[1]*5}`);
    const changed=previous!==selected?notes.filter(n=>!old.includes(n)):[];
    const palette=document.getElementById('note-palette');palette.replaceChildren();
    [...notes,notes[0]].forEach((note,i)=>{
      const button=document.createElement('button');button.type='button';button.className=(i===0||i===7?'tonic ':'')+(/[♯♭]/.test(note)?'accidental':'');
      const isNew=changed.length===1&&changed.includes(note);
      if(isNew)button.classList.add('changed-note');
      button.innerHTML=`${note}<span>${isNew?'new':i===7?'home':i+1}</span>`;button.setAttribute('aria-label',`Play ${note}, ${i===7?'octave': 'degree '+(i+1)}`);
      button.addEventListener('click',()=>sound([[0,[60+current()[4]+major[i]],.45,[button]]],`${note} · ${i===0||i===7?'home note':'scale degree '+(i+1)}`));palette.append(button);
    });
    renderChords();
    if(previous!==selected){const changes=notes.filter(n=>!old.includes(n));const removed=old.filter(n=>!notes.includes(n));document.getElementById('move-insight').textContent=`${oldName} → ${name}: ${changes.length===1?'six notes stay. '+removed[0]+' becomes '+changes[0]+'.': 'New palette: '+changes.join(', ')+'.'} Try the same chord journey here.`;}
    status.textContent=`${name} major is ready. Tap a note or play a chord journey.`;
    if(audition&&document.getElementById('tap-sound').checked)sound([[0,chord(0).midi,.6,[buttons[selected]]]],`${name} major · home chord`);
  }
  async function sound(events,label){
    stop(false);const token=generation;
    try{
      context ||= new (window.AudioContext||window.webkitAudioContext)();await context.resume();if(token!==generation)return;
      const volume=Number(document.getElementById('fifths-volume').value)/100,startTime=context.currentTime+.04;
      events.forEach(([offset,notes,length,elements=[]])=>{
        notes.forEach(midi=>{
          const osc=context.createOscillator(),gain=context.createGain(),start=startTime+offset;
          osc.type='triangle';osc.frequency.value=440*2**((midi-69)/12);
          gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume*.2/notes.length,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+length);
          osc.connect(gain).connect(context.destination);osc.start(start);osc.stop(start+length+.02);voices.push(osc);
          osc.onended=()=>{osc.disconnect();gain.disconnect();voices=voices.filter(v=>v!==osc);};
        });
        timers.push(setTimeout(()=>{if(token===generation)elements.forEach(e=>e.classList.add('is-playing'));},(offset+.04)*1000));
        timers.push(setTimeout(()=>{if(token===generation)elements.forEach(e=>e.classList.remove('is-playing'));},(offset+length+.04)*1000));
      });
      const end=Math.max(...events.map(e=>e[0]+e[2]));timers.push(setTimeout(()=>{if(token===generation)status.textContent='Your turn. Change the key or try another sound.';},(end+.1)*1000));
      status.textContent='Playing: '+label;
    }catch(error){console.error('Circle audio:',error);stop(false);status.textContent='Audio is unavailable. Follow the colored notes and chord names instead.';}
  }
  function play(mode){
    const root=60+current()[4],tiles=[...document.querySelectorAll('#note-palette button')];
    if(mode==='chords'){
      const pattern=patterns[document.getElementById('progression').value],pads=[...document.querySelectorAll('.chord-pad')];
      sound(pattern.map((d,i)=>[i*.8,chord(d).midi,.7,[pads[i],...(d===0?[buttons[selected]]:d===3?[buttons[(selected+11)%12]]:d===4?[buttons[(selected+1)%12]]:[])]]),current()[0]+' · '+pattern.map(d=>chord(d).name).join(' → '));
    }else{
      const intervals=mode==='fifth'?[0,7]:mode==='minor'?[0,2,3,5,7,8,10,12]:major;
      const tonic=mode==='minor'?root-3:root;
      sound(intervals.map((n,i)=>[i*.38,[tonic+n],.34,[tiles[mode==='minor'?(i+5)%7:mode==='fifth'?i*4:i]]]),mode==='minor'?current()[1]+' natural minor':current()[0]+(mode==='fifth'?' → perfect fifth':' major scale'));
    }
  }
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
