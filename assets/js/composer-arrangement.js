/* Pure score transformations shared by every composer workspace. No source mutations. */
(function (root) {
  'use strict';
  const pitches=['C','D','E','F','G','A','B'], natural=[0,2,4,5,7,9,11];
  const marks=/@(?:K:-?\d+|T:\d+\/\d+|L:\d+(?:\/\d+)?|N:\d+|Fine|DC|[1-9](?:\.[1-9])*)(?=\s|$)/g;
  function shiftKey(key,fifths) { let k=+key+fifths;while(k>7)k-=12;while(k< -7)k+=12;return k; }
  function transpose(text,chromatic,diatonic,fifths) {
    return text.replace(/([A-G])([#bn]*)(-?\d+)/g,(_,letter,accidental,register)=> {
      const index=pitches.indexOf(letter), absolute=(+register+1)*12+natural[index]+[...accidental].reduce((s,a)=>s+(a==='#'?1:a==='b'?-1:0),0)+chromatic;
      const d=+register*7+index+diatonic, octave=Math.floor(d/7), target=((d%7)+7)%7, delta=absolute-((octave+1)*12+natural[target]);
      return pitches[target]+(delta<0?'b'.repeat(-delta):'#'.repeat(delta))+octave;
    }).replace(/@K:(-?\d+)/g,(_,k)=>'@K:'+shiftKey(k,fifths));
  }
  const PITCH=/([A-G])([#bn]*)(-?\d+)/g;
  function midiOf(letter,accidental,register){return (+register+1)*12+natural[pitches.indexOf(letter)]+[...accidental].reduce((s,a)=>s+(a==='#'?1:a==='b'?-1:0),0);}
  // Prefer one octave displacement for the whole phrase. Fold only remaining
  // outliers, retaining spelling, rhythm and pitch class; report every edit.
  const VIOLIN_LOW=55, VIOLIN_HIGH=100;
  function fitRange(text,low,high) {
    const midis=[];text.replace(PITCH,(t,l,a,r)=>{midis.push(midiOf(l,a,r));return t;});
    if(!midis.length)return {notes:text,shift:0,raised:0,lowered:0};
    const perOctave=Math.max(2,midis.length*0.05);let shift=0,best=Infinity;
    for(const s of [0,-12,12,-24,24,-36,36,-48,48]) {
      const cost=midis.filter(m=>m+s<low||m+s>high).length+Math.abs(s)/12*perOctave;
      if(cost<best){best=cost;shift=s;}
    }
    if(shift)text=transpose(text,shift,shift/12*7,0);
    let raised=0,lowered=0;
    text=text.replace(PITCH,(token,l,a,r)=>{
      const m=midiOf(l,a,r);let delta=0;
      while(m+delta<low)delta+=12;
      while(m+delta>high)delta-=12;
      if(delta>0)raised++;if(delta<0)lowered++;
      return delta?transpose(token,delta,delta/12*7,0):token;
    });
    return {notes:text,shift,raised,lowered};
  }
  function fitViolin(text) { return fitRange(text,VIOLIN_LOW,VIOLIN_HIGH); }
  function line(src,index,voice,lowest) {
    const st=src.staves[index];if(!st)throw new Error('Choose a source staff.');
    const selected=st.voices?st.voices[voice]:st;if(!selected)throw new Error('Choose a source voice.');
    const first=src.staves[0], guide=(first.voices?first.voices[0]:first).notes.split('|');
    let notes=selected.notes.split('|').map((bar,i)=> {
      const reference=guide[i]||'', map=reference.match(marks)||[];
      bar=bar.replace(marks,'').replace(/^\s*:/,'').replace(/:\s*$/,'').trim();
      return (reference.trim().startsWith(':')?': ':'')+map.join(' ')+' '+bar+(reference.trim().endsWith(':')?' :':'');
    }).join('|').replace(/\(([^)]+)\)/g,(_,chord)=> {
      const ps=chord.trim().split(/\s+/).sort((a,b)=>root.MusicNotation.parsePitch(a.replace('n','')).midi-root.MusicNotation.parsePitch(b.replace('n','')).midi);
      return lowest?ps[0]:ps[ps.length-1];
    }).replace(/@C:(treble|bass|alto)/g,'');
    // Chord extraction can leave a tie aimed at a different selected note.
    // Remove it before octave fitting could turn that leap into a false tie.
    const events=[];
    mapEvents(notes,token=>{events.push(token);return token;});
    let eventIndex=0;
    notes=mapEvents(notes,token=>{
      const next=events[++eventIndex], pitch=/^([A-G][#bn]*-?\d+)/.exec(token), target=/^([A-G][#bn]*-?\d+)/.exec(next||'');
      const midi=p=>root.MusicNotation.parsePitch(p[1].replace('n','')).midi;
      return token.includes('~') && (!pitch || !target || midi(pitch)!==midi(target))?token.replace('~',''):token;
    });
    return {label:st.label||'Selected voice',clef:lowest?'bass':'treble',notes};
  }
  // Work on complete score tokens so inherited durations, tuplets and grace
  // notes survive reductions. Callbacks receive only timed events.
  function mapEvents(text, callback) {
    let bar=0,index=0;
    return text.split('|').map(part=>{
      index=0;
      const out=part.replace(/g:\([^)]*\)\S*|\([^)]*\)\S*|\S+/g,token=>{
        if (/^(?:g:|[@!{}:])/.test(token)) return token;
        return callback(token,bar,index++);
      });
      bar++;return out;
    }).join('|');
  }
  function sourceBass(src,selected,selectedVoice=0) {
    const candidates=[];
    src.staves.forEach((st,staff)=>(st.voices||[st]).forEach((v,voice)=>{
      if(staff===selected && voice===selectedVoice)return;
      if(/timpani|percussion|drum/i.test(st.label||''))return;
      const midis=[...v.notes.matchAll(/([A-G])([#bn]*)(-?\d+)/g)].map(m=>midiOf(m[1],m[2],m[3])).sort((a,b)=>a-b);
      if(!midis.length)return;
      const preferred=/cello|continuo|pedal|left hand|double bass|contrabass/i.test(st.label||'');
      const bars=v.notes.split('|').filter(bar=>bar.trim());
      const coverage=bars.filter(bar=>/[A-G][#bn]*-?\d+/.test(bar)).length/bars.length;
      candidates.push({staff,voice,cost:midis[Math.floor(midis.length/2)]+(preferred?0:24)+(1-coverage)*36});
    }));
    return candidates.sort((a,b)=>a.cost-b.cost)[0];
  }
  function pianoPart(src,staff,voice,lowest) {
    const selected=src.staves[staff], definition=(selected.voices||[selected])[voice];
    // Use line() for the shared road map, then restore playable source chords.
    const part=line(src,staff,voice,lowest);
    const withChords=definition.notes.replace(/\(([^)]+)\)/g,(_,chord)=>{
      const ps=chord.trim().split(/\s+/).sort((a,b)=>root.MusicNotation.parsePitch(a.replace('n','')).midi-root.MusicNotation.parsePitch(b.replace('n','')).midi);
      const edge=root.MusicNotation.parsePitch((lowest?ps[0]:ps.at(-1)).replace('n','')).midi;
      const nearby=ps.filter(p=>Math.abs(root.MusicNotation.parsePitch(p.replace('n','')).midi-edge)<=12);
      const keep=lowest?nearby.slice(0,5):nearby.slice(-5);
      return keep.length===1?keep[0]:'('+keep.join(' ')+')';
    });
    // Reuse the exact metadata synchronization without extracting chords.
    const guide=part.notes.split('|');
    part.notes=withChords.split('|').map((bar,i)=>{
      const reference=guide[i]||'';
      return (reference.trim().startsWith(':')?': ':'')+(reference.match(marks)||[]).join(' ')+' '+bar.replace(marks,'').replace(/^\s*:/,'').replace(/:\s*$/,'').replace(/@C:(treble|bass|alto)/g,'').trim()+(reference.trim().endsWith(':')?' :':'');
    }).join('|');
    part.notes=fitRange(part.notes,lowest?28:48,lowest?67:96).notes;
    part.label=lowest?'Piano · left hand (source bass)':'Piano · right hand (selected part)';
    return part;
  }
  function soloGuitar(src,settings) {
    const result=arrange(src,{...settings,mode:'melody'});
    const melody=result.staves[0], bass=sourceBass(src,+settings.staff||0,+settings.voice||0);
    const fit=fitRange(melody.notes,40,76);melody.notes=fit.notes;
    Object.defineProperty(result,'registerFit',{value:{shift:fit.shift,raised:fit.raised,lowered:fit.lowered},enumerable:false});
    result.instrument='pluck';
    result.tablature={tuning:[64,59,55,50,45,40],maxFret:12,maxSpan:4,maxFingers:4,reattack:true};
    result.arrangementNote='Solo-guitar study: selected melody with sparse source bass. Bass attacks are retained only where they coincide with melody attacks and fit the hand; bass notes may be shortened. Inner voices are omitted. Review shifts and ornaments at a slow tempo.';
    if(!bass){result.arrangementNote='Guitar melody study: no independent pitched bass voice is available in this source. The selected line is preserved with register edits for guitar.';return result;}
    const source=root.ScoreEngine.prepare(src);root.ScoreEngine.analyse(source);
    const model=root.ScoreEngine.prepare(result);
    const bassBars=source.staves[bass.staff].voices[bass.voice];
    const tuning=[64,59,55,50,45,40];
    const bassNotes=mapEvents(melody.notes,(token,bi,ei)=>{
      const event=model.staves[0].bars[bi].events[ei];
      const rest='r/'+(4/event.base)+'.'.repeat(event.dots);
      if(event.kind!=='note')return token;
      const low=bassBars[bi].events.find(e=>e.kind==='note' && Math.abs(e.start-event.start)<1e-6 && e.dur+1e-6>=event.dur && e.pitches.some(p=>!p.tiedFrom));
      if(!low)return rest;
      const p=low.pitches.filter(p=>!p.tiedFrom).reduce((a,b)=>a.midi<b.midi?a:b);
      // Retain source spelling and choose the closest playable bass octave.
      let midi=p.midi;while(midi<40)midi+=12;while(midi>59)midi-=12;
      if(midi>=event.pitches[0].midi)return rest;
      const spelling=pitches[p.l]+(p.a<0?'b'.repeat(-p.a):'#'.repeat(p.a))+p.o;
      const pitch=transpose(spelling,midi-p.midi,(midi-p.midi)/12*7,0);
      return pitch+'/'+(4/event.base)+'.'.repeat(event.dots);
    }).replace(/g:(?:\([^)]*\)|\S+)/g,'').replace(/@[UDA](?=\s|$)|![a-z]+/g,'');
    result.staves=[{label:'Guitar · melody and source bass',clef:'treble',voices:[{notes:melody.notes,stem:'up'},{notes:bassNotes,stem:'down'}]}];
    // A bass never displaces the melody. Remove both-note grips the tab solver
    // cannot place, including constraints from tied melody notes.
    for(;;) {
      const prepared=root.ScoreEngine.prepare(result);root.ScoreEngine.analyse(prepared);
      const tabs=root.GuitarTablature.finger(prepared,tuning,0,result.tablature);
      const omit=new Set();
      tabs.forEach((bar,bi)=>bar.forEach(g=>{if(g.notes.some(n=>n.string<0))omit.add(bi+':'+g.start.toFixed(7));}));
      if(!omit.size)break;
      let removed=0;
      result.staves[0].voices[1].notes=mapEvents(result.staves[0].voices[1].notes,(token,bi,ei)=>{
        const e=prepared.staves[0].voices[1][bi].events[ei];
        if(e.kind==='note' && omit.has(bi+':'+e.start.toFixed(7))){removed++;return 'r/'+(4/e.base)+'.'.repeat(e.dots);}
        return token;
      });
      if(!removed)break;
    }
    return result;
  }
  function arrange(src,settings) {
    const m=settings.mode||'original', selected=+settings.staff||0, voice=+settings.voice||0;
    const result=JSON.parse(JSON.stringify(src));result.id=(settings.id||'composer')+'-arrangement';
    if (m==='guitar' && src.guitarArrangement) {
      Object.assign(result,JSON.parse(JSON.stringify(src.guitarArrangement)));
      delete result.guitarArrangement;
      result.tablature={tuning:[64,59,55,50,45,40],...result.tablature};
      result.source.label += ' · classroom solo-guitar adaptation; register and inner voices edited';
      return result;
    }
    if(m==='guitar-solo') {
      if(src.guitarArrangement)return arrange(src,{...settings,mode:'guitar'});
      if(src.instrument==='pluck')return arrange(src,{...settings,mode:'original'});
      return soloGuitar(src,settings);
    }
    if (m==='original'||m==='chords') return result;
    if(m==='piano') {
      // A solo pianist can be notated on four staves (e.g. Rachmaninoff's
      // Op. 3 No. 2). Staff count alone must never trigger a reduction.
      const native=src.instrument==='piano' && (src.staves.length<=2 || src.staves.every(st=>/^(Right|Left) hand/i.test(st.label||'')));
      if(!native) {
        const bass=sourceBass(src,selected,voice);
        result.staves=[pianoPart(src,selected,voice,false)];
        if(bass)result.staves.push(pianoPart(src,bass.staff,bass.voice,true));
        result.grand=result.staves.length===2;
        result.arrangementNote=bass?'Solo-piano study: selected part and source bass, with up to five source chord tones retained within an octave per attack. Registers may move by octaves; other voices are omitted. Check overlapping held notes and hand shifts before performing.':'Piano melody study: no independent source bass is available. Source chord tones are retained within an octave per attack, with register edits for piano. Review shifts before performing.';
      }
      result.instrument='piano';result.staves.forEach(st=>{st.instrument='piano';});return result;
    }
    const bass=m==='bass';result.staves=[line(src,selected,voice,bass)];result.grand=false;
    let chromatic=+settings.octave||0, diatonic=chromatic/12*7, fifths=0;
    if(m==='alto'){chromatic+=9;diatonic+=5;fifths=3;result.playbackTranspose=-9;}
    if(m==='tenor'){chromatic+=14;diatonic+=8;fifths=2;result.playbackTranspose=-14;}
    result.staves[0].notes=transpose(result.staves[0].notes,chromatic,diatonic,fifths);
    if(['violin','guitar','bass'].includes(m)){
      const fit=m==='violin'?fitViolin(result.staves[0].notes):fitRange(result.staves[0].notes,bass?28:40,bass?62:83);result.staves[0].notes=fit.notes;
      if(m==='violin'&&!/violin/i.test(result.staves[0].label))result.staves[0].label='Violin · '+result.staves[0].label;
      Object.defineProperty(result,'registerFit',{value:{shift:fit.shift,raised:fit.raised,lowered:fit.lowered},enumerable:false});
      if(m==='violin')Object.defineProperty(result,'violinFit',{value:result.registerFit,enumerable:false});
    }
    result.key=shiftKey(src.key||0,fifths);delete result.keyName;
    result.instrument=/alto|tenor/.test(m)?'sax':m==='guitar'?'pluck':m==='violin'?'violin':bass?'bass':'flute';return result;
  }
  root.ComposerArrangement={arrange,line,transpose,shiftKey,fitRange,fitViolin,VIOLIN_LOW,VIOLIN_HIGH};
})(typeof window!=='undefined'?window:globalThis);
