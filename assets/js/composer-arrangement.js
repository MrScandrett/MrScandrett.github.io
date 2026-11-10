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
    result.key=shiftKey(src.key||0,fifths);delete result.keyName;
    result.instrument=/alto|tenor/.test(m)?'sax':m==='guitar'?'pluck':bass?'bass':'flute';return result;
  }
  root.ComposerArrangement={arrange,line,transpose,shiftKey};
})(typeof window!=='undefined'?window:globalThis);
