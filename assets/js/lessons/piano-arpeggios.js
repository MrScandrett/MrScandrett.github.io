/* Piano triad routes: key degrees and chord roles share one major-scale model.
   Absolute indices are C4=0 through C6=24, matching PianoTheory and PianoAudio. */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var PT=window.PianoTheory, audio=window.PianoAudio;
  var $=function (id) { return document.getElementById(id); };
  if (!PT || !$('parpKey')) return;
  var keys=[
    ['C',0,['C','D','E','F','G','A','B']], ['D♭',1,['D♭','E♭','F','G♭','A♭','B♭','C']],
    ['D',2,['D','E','F♯','G','A','B','C♯']], ['E♭',3,['E♭','F','G','A♭','B♭','C','D']],
    ['E',4,['E','F♯','G♯','A','B','C♯','D♯']], ['F',5,['F','G','A','B♭','C','D','E']],
    ['G♭',6,['G♭','A♭','B♭','C♭','D♭','E♭','F']], ['G',7,['G','A','B','C','D','E','F♯']],
    ['A♭',8,['A♭','B♭','C','D♭','E♭','F','G']], ['A',9,['A','B','C♯','D','E','F♯','G♯']],
    ['B♭',10,['B♭','C','D','E♭','F','G','A']], ['B',11,['B','C♯','D♯','E','F♯','G♯','A♯']]
  ];
  var scale=[0,2,4,5,7,9,11], romans=['I','ii','iii','IV','V','vi','vii°'];
  var suffixes=['','m','m','','','m','dim'];
  var presets={cadence:[0,1,4,0], '251':[1,4,0], turnaround:[0,5,1,4,0], pop:[0,4,5,3,0], ladder:[0,1,2,3,4,5,6,0]};
  var degree=0, bar=0, custom=[0,1,4,0], route=presets.cadence.slice();
  var paths=[], timers=[], playing=false, question=0, questionCount=0, playKind=null;
  function node(tag,cls,text) { var e=document.createElement(tag); if(cls)e.className=cls; if(text!=null)e.textContent=text; return e; }
  function button(text,action,cls) { var e=node('button',cls||'pc-btn',text); e.type='button'; e.onclick=action; return e; }
  function key() { return keys[+$('parpKey').value]; }
  function pcs() { return scale.map(function (iv) { return (key()[1]+iv)%12; }); }
  function triad(d) { return [d,(d+2)%7,(d+4)%7]; }
  function chordName(d) { return key()[2][d]+(suffixes[d]==='dim'?'°':suffixes[d]); }
  function roles(d) { return ['1',d===0||d===3||d===4?'3':'♭3',d===6?'♭5':'5']; }
  function roleClass(i) { return ['parp-role-root','parp-role-third','parp-role-fifth'][i]; }
  function name(idx) { var n=pcs().indexOf(idx%12); return n>=0?key()[2][n]:PT.PITCHES[idx%12].replace('#','♯'); }
  function pitchName(idx) {
    var spelled=name(idx), accidental=spelled.includes('♭')?-1:spelled.includes('♯')?1:0;
    // Written C♭5 is the sounding B4; the octave follows the written letter.
    return spelled+(Math.floor((60+idx-accidental)/12)-1);
  }
  function stop() {
    timers.forEach(clearTimeout); timers=[];
    if(playing)$('parpStatus').textContent='Stopped. Replay starts from the first bar.';
    playing=false; playKind=null;
    document.querySelectorAll('#arpeggios .parp-sounding, #parpStaff .is-current').forEach(function(e){e.classList.remove('parp-sounding','is-current');});
  }
  function stopAll() { $('pcStop').click(); }
  function later(fn,ms) { timers.push(setTimeout(fn,ms)); }
  window.addEventListener('piano-studio-stop',stop);
  function makePath(d,previous) {
    var chord=triad(d).map(function(n){return pcs()[n];}), mode=$('parpPath').value;
    var rotation=mode==='third'?1:mode==='fifth'?2:0, candidates=[];
    for(var start=0;start<=24;start++) {
      var role=chord.indexOf(start%12);
      if(role<0 || (mode!=='connected' && role!==rotation))continue;
      [1,-1].forEach(function(direction) {
        if(direction===-1 && mode!=='connected')return;
        var notes=[start], pitch=start;
        for(var i=1;i<3;i++) {
          var pc=chord[(role+direction*i+3)%3];
          do { pitch+=direction; } while(PT.mod12(pitch)!==pc);
          notes.push(pitch);
        }
        notes.push(start+12*direction);
        if(notes.some(function(n){return n<0||n>24;}))return;
        var jump=previous==null?0:Math.abs(start-previous);
        candidates.push({notes:notes,cost:jump*1000+start*.01+(direction===-1?.1:0)});
      });
    }
    candidates.sort(function(a,b){return a.cost-b.cost;});
    return candidates.length?candidates[0].notes:[];
  }
  function rebuildPaths() {
    var previous=null;
    paths=route.map(function(d){var path=makePath(d,$('parpPath').value==='connected'?previous:null);previous=path[3];return path;});
  }
  function selectedPath() { return route[bar]===degree?paths[bar]:makePath(degree,null); }
  function activate(d,index) {
    degree=d; if(index!=null)bar=index;
    document.querySelectorAll('#parpFamily button').forEach(function(b,i){b.setAttribute('aria-pressed',String(i===d));});
    document.querySelectorAll('#parpTimeline button').forEach(function(b,i){b.setAttribute('aria-pressed',String(i===bar&&route[i]===degree));});
    renderDetail();
  }
  function renderFamily() {
    $('parpKeyHeading').textContent=key()[0]+' major: seven notes, seven triads';
    $('parpScale').replaceChildren(); $('parpFamily').replaceChildren();
    key()[2].forEach(function(n,i){
      var tone=node('span','',n);tone.appendChild(node('small','','Key degree '+(i+1)));$('parpScale').appendChild(tone);
      var b=button('',function(){stopAll();activate(i);},'parp-family-chord');
      b.appendChild(node('strong','',romans[i]+' · '+chordName(i)));
      b.appendChild(node('span','',triad(i).map(function(n){return key()[2][n];}).join('–')));
      b.appendChild(node('small','','Key '+triad(i).map(function(n){return n+1;}).join('–')));
      b.setAttribute('aria-pressed',String(i===degree));$('parpFamily').appendChild(b);
    });
  }
  function renderTimeline() {
    $('parpTimeline').replaceChildren();
    route.forEach(function(d,i){
      var b=button('',function(){stopAll();activate(d,i);},'parp-bar');b.dataset.bar=i;
      b.appendChild(node('small','','Bar '+(i+1)));b.appendChild(node('strong','',romans[d]));b.appendChild(node('span','',chordName(d)));
      b.appendChild(node('small','',paths[i].map(name).join('–')));b.setAttribute('aria-pressed',String(i===bar&&d===degree));$('parpTimeline').appendChild(b);
    });
  }
  function renderDetail() {
    var tones=triad(degree), rel=roles(degree), path=selectedPath();
    $('parpChordHeading').textContent=romans[degree]+' · '+chordName(degree)+' in '+key()[0]+' major';
    $('parpFormula').textContent='Stack alternate scale notes: '+tones.map(function(n){return n+1;}).join('–')+' in the key. Chord formula: '+rel.join('–')+'.';
    $('parpToneTable').replaceChildren();
    tones.forEach(function(n,i){var t=node('div',roleClass(i));t.appendChild(node('strong','',key()[2][n]));t.appendChild(node('span','','Key degree '+(n+1)));t.appendChild(node('span','','Chord tone '+rel[i]));$('parpToneTable').appendChild(t);});
    renderKeyboard(path);renderSteps(path);renderHandHint(path);
    renderStaff(path.map(function(idx){return {absIndex:idx,spelling:pitchName(idx),dur:1};}));
  }
  function renderKeyboard(path) {
    var keyboard=$('parpKeyboard'), layout=PT.buildKeys(), tones=triad(degree);keyboard.replaceChildren();
    var white=node('div','parp-white-row'), black=node('div','parp-black-layer');
    function build(k,isBlack) {
      var idx=k.absIndex, keyDegree=pcs().indexOf(idx%12), role=tones.indexOf(keyDegree);
      var b=button('',function(){stopAll();audio.tone(PT.noteFreq(idx));markNote(idx,-1);$('parpStatus').textContent=pitchName(idx)+(keyDegree>=0?' · key degree '+(keyDegree+1):' · outside '+key()[0]+' major')+(role>=0?' · chord tone '+roles(degree)[role]:'');},'parp-key '+(isBlack?'parp-black':'parp-white')+(role>=0?' '+roleClass(role):''));
      b.dataset.note=idx;b.setAttribute('aria-label',pitchName(idx)+(keyDegree>=0?', key degree '+(keyDegree+1):', outside selected key')+(role>=0?', chord tone '+roles(degree)[role]:''));
      if(isBlack){var w=100/PT.WHITE_COUNT;b.style.left=((k.leftWhiteIdx+1)*w-w*.32)+'%';b.style.width=w*.64+'%';}
      b.appendChild(node('span','parp-key-name',pitchName(idx)));
      if(keyDegree>=0&&role<0&&$('parpContext').checked)b.appendChild(node('span','parp-context-dot','•'));
      var steps=[];path.forEach(function(n,i){if(n===idx)steps.push(i+1);});
      if(steps.length){b.classList.add('parp-path-key');b.appendChild(node('span','parp-step-ring',steps.join('/')));}
      return b;
    }
    layout.white.forEach(function(k){white.appendChild(build(k,false));});layout.black.forEach(function(k){black.appendChild(build(k,true));});
    // Chromatic DOM order keeps Tab traversal ordered by pitch despite the overlay.
    var all=[].slice.call(white.children).concat([].slice.call(black.children));
    all.sort(function(a,b){return +a.dataset.note-+b.dataset.note;});
    all.forEach(function(b){keyboard.appendChild(b);});
    // CSS positions every key by white-key slot, so DOM order can stay chromatic.
    layout.white.forEach(function(k){var b=keyboard.querySelector('[data-note="'+k.absIndex+'"]');b.style.left=(k.globalWhiteIdx*100/PT.WHITE_COUNT)+'%';b.style.width=(100/PT.WHITE_COUNT)+'%';});
  }
  function renderSteps(path) {
    $('parpSteps').replaceChildren();
    path.forEach(function(idx,i){var role=triad(degree).indexOf(pcs().indexOf(idx%12));var b=button('',function(){stopAll();renderStaff(path.map(function(n){return{absIndex:n,spelling:pitchName(n),dur:1};}));audio.tone(PT.noteFreq(idx));markNote(idx,i);$('parpStatus').textContent='Beat '+(i+1)+' · '+pitchName(idx)+' · chord tone '+roles(degree)[role];},'parp-phrase-note '+roleClass(role));
      b.dataset.step=i;b.dataset.note=idx;b.appendChild(node('small','','Beat '+(i+1)));b.appendChild(node('strong','',pitchName(idx)));b.appendChild(node('span','','Key '+(pcs().indexOf(idx%12)+1)+' / chord '+roles(degree)[role]));$('parpSteps').appendChild(b);});
  }
  function renderStaff(notes) {
    PT.renderStaff($('parpStaff'),notes,{showLabels:true,cellWidth:70});
    $('parpStaff').querySelector('svg').setAttribute('aria-label','Treble staff, quarter notes: '+notes.map(function(n){return n.spelling;}).join(', '));
  }
  function renderHandHint(path) {
    var hand=$('parpHand').value;
    if(key()[1]===0&&degree===0&&$('parpPath').value==='root') {
      $('parpHandHint').textContent='C-major starting suggestion: '+(hand==='right'?'right hand 1–2–3–5':'left hand 5–3–2–1')+' for '+path.map(pitchName).join('–')+'. These are finger numbers, not key degrees. Move comfortably rather than forcing a fixed reach.';
    } else $('parpHandHint').textContent='Practice with the '+hand+' hand alone first. 1 = thumb, 5 = little finger. The beat numbers and chord-tone numbers above are not finger numbers. Choose a relaxed fingering for this key and direction; transposing can change the white/black-key pattern. Reposition between phrases when needed.';
  }
  function markNote(idx,step) {
    document.querySelectorAll('#arpeggios .parp-sounding, #parpStaff .is-current').forEach(function(e){e.classList.remove('parp-sounding','is-current');});
    var keyBtn=$('parpKeyboard').querySelector('[data-note="'+idx+'"]');if(keyBtn)keyBtn.classList.add('parp-sounding');
    var note=$('parpSteps').querySelector('[data-step="'+step+'"]');if(note && +note.dataset.note===idx)note.classList.add('parp-sounding');
    var staff=$('parpStaff').querySelector('[data-index="'+step+'"]');if(staff)staff.classList.add('is-current');
    var active=$('parpTimeline').querySelector('[data-bar="'+bar+'"]');if(active&&playing&&playKind==='route'&&route[bar]===degree)active.classList.add('parp-sounding');
  }
  function renderConnections() {
    $('parpConnections').replaceChildren();
    for(var i=0;i<route.length-1;i++){
      var a=route[i],b=route[i+1],shared=triad(a).filter(function(n){return triad(b).indexOf(n)>=0;});
      var text=romans[a]+' → '+romans[b]+': '+(shared.length?'shared '+shared.map(function(n){return key()[2][n]+' (key '+(n+1)+')';}).join(', '):'no shared chord tones');
      var from=paths[i][3],to=paths[i+1][0];text+='. Phrase connects '+pitchName(from)+' → '+pitchName(to)+' ('+Math.abs(to-from)+' semitones).';$('parpConnections').appendChild(node('p','',text));
    }
  }
  function renderQuestion() {
    var change=question%Math.max(1,route.length-1),d=route[Math.min(change+1,route.length-1)],role=questionCount%3,correct=triad(d)[role];
    $('parpQuestion').textContent='Target '+['the root','the third','the fifth'][role]+' of '+romans[d]+' ('+chordName(d)+')'+(route.length>1?' after '+romans[route[change]]:'')+'. Which note in '+key()[0]+' major should you aim for?';
    $('parpFeedback').textContent='';$('parpAnswers').replaceChildren();
    key()[2].forEach(function(n,i){var b=button(n,function(){stopAll();if(i===correct){$('parpFeedback').textContent='Yes. '+n+' is key degree '+(i+1)+' and chord tone '+roles(d)[role]+' of '+chordName(d)+'.';b.classList.add('is-active');}else $('parpFeedback').textContent='Try again. Build '+chordName(d)+' from '+triad(d).map(function(j){return key()[2][j];}).join('–')+' and choose its '+['root','third','fifth'][role]+'.';},'pc-pick-btn');$('parpAnswers').appendChild(b);});
  }
  function refresh() {
    rebuildPaths();renderFamily();renderTimeline();renderDetail();renderConnections();renderQuestion();
    $('parpCustom').hidden=$('parpRoute').value!=='custom';$('parpRemove').disabled=custom.length<=1;$('parpAppend').disabled=custom.length>=8;
    $('parpStatus').textContent='Ready in '+key()[0]+' major. Four quarter notes per bar.';
  }
  function play(kind) {
    stopAll();if(!audio.getContext()){$('parpStatus').textContent='Audio is unavailable. Follow the notation on your piano.';return;}
    playKind=kind; if(kind!=='scale')renderDetail();
    var tempo=Number($('parpTempo').value);if(!Number.isFinite(tempo))tempo=80;tempo=Math.max(40,Math.min(180,tempo||80));$('parpTempo').value=tempo;
    var beat=60/tempo,events=[];
    if(kind==='block'){
      var notes=selectedPath().slice(0,3).sort(function(a,b){return a-b;});audio.block(notes.map(PT.noteFreq),{duration:beat*3});playing=true;
      notes.forEach(function(idx){var b=$('parpKeyboard').querySelector('[data-note="'+idx+'"]');if(b)b.classList.add('parp-sounding');});
      var bassRole=triad(degree).indexOf(pcs().indexOf(notes[0]%12));
      $('parpStatus').textContent='Block chord '+chordName(degree)+' · '+notes.map(pitchName).join('–')+' · lowest note '+pitchName(notes[0])+' · '+['root position','first inversion','second inversion'][bassRole]+'.';
      later(function(){stop();$('parpStatus').textContent='Finished block chord. Compare the same tones one at a time.';},beat*3*1000);return;
    }
    if(kind==='route')paths.forEach(function(path,i){path.forEach(function(idx,j){events.push({idx:idx,d:route[i],bar:i,step:j});});});
    else if(kind==='chord')selectedPath().forEach(function(idx,j){events.push({idx:idx,d:degree,bar:bar,step:j});});
    else {
      if(!$('parpContext').checked){$('parpContext').checked=true;renderDetail();}
      var notes=scale.concat([12]).map(function(iv){return key()[1]+iv;});
      renderStaff(notes.map(function(idx){return{absIndex:idx,spelling:pitchName(idx),dur:1};}));
      notes.forEach(function(idx,i){events.push({idx:idx,d:degree,bar:bar,step:i});});
    }
    playing=true;
    events.forEach(function(e,i){audio.tone(PT.noteFreq(e.idx),{delay:i*beat,duration:beat*.95});later(function(){
      if(degree!==e.d||bar!==e.bar)activate(e.d,e.bar);markNote(e.idx,e.step);
      $('parpStatus').textContent=(kind==='scale'?'Scale note '+(i+1)+' of 8':(kind==='chord'?'Selected arpeggio':'Bar '+(e.bar+1))+' · '+romans[e.d]+' '+chordName(e.d)+' · beat '+(e.step+1))+' · '+pitchName(e.idx)+' · key degree '+(pcs().indexOf(e.idx%12)+1);
    },i*beat*1000);});
    later(function(){stop();$('parpStatus').textContent='Finished. Replay, slow the tempo, or transpose the same route.';},events.length*beat*1000);
  }
  keys.forEach(function(k,i){var o=node('option','',k[0]+' major');o.value=i;$('parpKey').appendChild(o);});
  romans.forEach(function(r,i){var o=node('option','',r);o.value=i;$('parpAppendDegree').appendChild(o);});
  ['parpKey','parpPath','parpContext','parpHand'].forEach(function(id){$(id).onchange=function(){stopAll();refresh();};});
  $('parpTempo').onchange=function(){stopAll();};
  $('parpRoute').onchange=function(){stopAll();route=(this.value==='custom'?custom:presets[this.value]).slice();bar=0;degree=route[0];question=0;refresh();};
  $('parpAppend').onclick=function(){if(custom.length>=8)return;stopAll();custom.push(+$('parpAppendDegree').value);route=custom.slice();refresh();};
  $('parpRemove').onclick=function(){if(custom.length<=1)return;stopAll();custom.pop();route=custom.slice();bar=Math.min(bar,route.length-1);degree=route[bar];refresh();};
  $('parpReset').onclick=function(){stopAll();custom=[0,1,4,0];route=custom.slice();bar=0;degree=0;refresh();};
  $('parpPlayRoute').onclick=function(){play('route');};$('parpPlayChord').onclick=function(){play('chord');};$('parpPlayBlock').onclick=function(){play('block');};$('parpPlayScale').onclick=function(){play('scale');};
  $('parpStop').onclick=function(){stopAll();bar=0;activate(route[0],0);$('parpStatus').textContent='Reset to bar 1. Ready to replay.';};
  $('parpNextQuestion').onclick=function(){question++;questionCount++;renderQuestion();};
  $('parpToStudio').onclick=function(){
    var entries=route.map(function(d,i){var abs=paths[i].slice(0,3).sort(function(a,b){return a-b;});var bass=name(abs[0]);return{name:chordName(d)+(abs[0]%12!==pcs()[d]?'/'+bass:'')+' ('+romans[d]+' in '+key()[0]+')',abs:abs};});
    var transfer={entries:entries,added:0};window.dispatchEvent(new CustomEvent('piano-add-route',{detail:transfer}));
    $('parpStatus').textContent=transfer.added===entries.length?'Added these triad voicings to the progression studio below. Use its block-chord style to compare harmony with this melodic route.':'Added '+transfer.added+' of '+entries.length+' bars. The studio holds 32 bars; remove bars there before adding more.';
  };
  document.querySelectorAll('[data-piano-interval]').forEach(function (btn) {
    btn.onclick = function () {
      stopAll();
      var interval = Number(btn.dataset.pianoInterval);
      audio.tone(PT.noteFreq(0), { duration: .65 });
      audio.tone(PT.noteFreq(interval), { delay: .7, duration: .65 });
      audio.block([PT.noteFreq(0), PT.noteFreq(interval)], { delay: 1.5, duration: 1.2 });
      $('pnoIntervalStatus').textContent = btn.textContent.replace('Hear ', '') + ' · ' + interval + ' semitone steps. Listen separately, then together.';
    };
  });
  refresh();
});
