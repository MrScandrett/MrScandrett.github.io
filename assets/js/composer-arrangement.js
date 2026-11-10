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
  /* Violin: G3 (open G string) up to E7. A line that mostly sits low moves up by whole
     octaves, so the melody keeps its shape; a few stray low notes don't move the piece
     (each octave of shift must save more than ~5% of the notes), they are lifted one by one. */
  const VIOLIN_LOW=55, VIOLIN_HIGH=100;
  function fitViolin(text) {
    const midis=[];text.replace(PITCH,(t,l,a,r)=>{midis.push(midiOf(l,a,r));return t;});
    if(!midis.length)return {notes:text,shift:0,raised:0};
    const hi=Math.max(...midis), perOctave=Math.max(2,midis.length*0.05);let shift=0,best=Infinity;
    for(const s of [0,12,24,36]) {
      if(s&&hi+s>VIOLIN_HIGH)continue;
      const cost=midis.filter(m=>m+s<VIOLIN_LOW).length+s/12*perOctave;
      if(cost<best){best=cost;shift=s;}
    }
    if(shift)text=transpose(text,shift,shift/12*7,0);
    let raised=0;
    text=text.replace(PITCH,(token,l,a,r)=>{let m=midiOf(l,a,r),up=0;while(m+up<VIOLIN_LOW)up+=12;if(!up)return token;raised++;return transpose(token,up,up/12*7,0);});
    return {notes:text,shift,raised};
  }
  function line(src,index,voice,lowest) {
    const st=src.staves[index];if(!st)throw new Error('Choose a source staff.');
    const selected=st.voices?st.voices[voice]:st;if(!selected)throw new Error('Choose a source voice.');
    const first=src.staves[0], guide=(first.voices?first.voices[0]:first).notes.split('|');
    const notes=selected.notes.split('|').map((bar,i)=> {
      const reference=guide[i]||'', map=reference.match(marks)||[];
      bar=bar.replace(marks,'').replace(/^\s*:/,'').replace(/:\s*$/,'').trim();
      return (reference.trim().startsWith(':')?': ':'')+map.join(' ')+' '+bar+(reference.trim().endsWith(':')?' :':'');
    }).join('|').replace(/\(([^)]+)\)/g,(_,chord)=> {
      const ps=chord.trim().split(/\s+/).sort((a,b)=>root.MusicNotation.parsePitch(a.replace('n','')).midi-root.MusicNotation.parsePitch(b.replace('n','')).midi);
      return lowest?ps[0]:ps[ps.length-1];
    }).replace(/@C:(treble|bass|alto)/g,'');
    return {label:st.label||'Selected voice',clef:lowest?'bass':'treble',notes};
  }
  function arrange(src,settings) {
    const m=settings.mode||'original', selected=+settings.staff||0, voice=+settings.voice||0;
    const result=JSON.parse(JSON.stringify(src));result.id=(settings.id||'composer')+'-arrangement';
    if (m==='original'||m==='chords') return result;
    if(m==='piano') {
      if(src.staves.length>2) {
        let bass=src.staves.findIndex(st=>/cello|bass/i.test(st.label));if(bass<0)bass=src.staves.length-1;
        result.staves=[line(src,selected,voice,false),line(src,bass,0,true)];
        result.staves[0].label='Piano · selected upper voice';result.staves[1].label='Piano · source bass';result.grand=true;
      }
      result.instrument='piano';result.staves.forEach(st=>{st.instrument='piano';});return result;
    }
    const bass=m==='bass';result.staves=[line(src,selected,voice,bass)];result.grand=false;
    let chromatic=+settings.octave||0, diatonic=chromatic/12*7, fifths=0;
    if(m==='alto'){chromatic+=9;diatonic+=5;fifths=3;result.playbackTranspose=-9;}
    if(m==='tenor'){chromatic+=14;diatonic+=8;fifths=2;result.playbackTranspose=-14;}
    result.staves[0].notes=transpose(result.staves[0].notes,chromatic,diatonic,fifths);
    if(m==='violin'){
      const fit=fitViolin(result.staves[0].notes);result.staves[0].notes=fit.notes;
      if(!/violin/i.test(result.staves[0].label))result.staves[0].label='Violin · '+result.staves[0].label;
      Object.defineProperty(result,'violinFit',{value:{shift:fit.shift,raised:fit.raised},enumerable:false});
    }
    result.key=shiftKey(src.key||0,fifths);delete result.keyName;
    result.instrument=/alto|tenor/.test(m)?'sax':m==='guitar'?'pluck':m==='violin'?'violin':bass?'bass':'flute';return result;
  }
  root.ComposerArrangement={arrange,line,transpose,shiftKey,fitViolin,VIOLIN_LOW,VIOLIN_HIGH};
})(typeof window!=='undefined'?window:globalThis);
