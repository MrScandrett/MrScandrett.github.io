/* Sounding-pitch tablature. Assign simultaneous notes together, retaining held strings. */
(function(root) {
  'use strict';
  function finger(model, tuning, pitchShift = 0) {
    let position=0, held=[];
    return model.staves[0].bars.map((bar,bi)=>{
      const groups=new Map();
      // Guitar classroom studies may divide the instrument across two staves.
      model.staves.forEach(st=>st.bars[bi].events.forEach(e=>{
        if(e.kind!=='note')return;
        const key=e.start.toFixed(7);
        if(!groups.has(key))groups.set(key,{start:e.start,notes:[]});
        e.pitches.forEach(p=>{const midi=p.midi+pitchShift,g=groups.get(key);if(!g.notes.some(n=>n.midi===midi))g.notes.push({midi,dur:e.dur,tied:!!p.tiedFrom,graces:e.graces||[]});});
      }));
      const result=[...groups.values()].sort((a,b)=>a.start-b.start);
      result.forEach(g=>{
        const now=model.barStart[bi]+g.start;
        held=held.filter(h=>h.end>now+1e-6 || (Math.abs(h.end-now)<1e-6 && g.notes.some(n=>n.tied&&n.midi===h.midi)));
        const fixed=[], fresh=[];
        g.notes.sort((a,b)=>b.midi-a.midi).forEach(n=>{
          const h=n.tied&&held.find(h=>h.midi===n.midi);
          if(h){h.end=now+n.dur;fixed.push({...n,string:h.string,fret:h.fret});}else fresh.push(n);
        });
        let best=null,bestCost=Infinity;
        function search(i,assigned,used) {
          if(i===fresh.length){
            const frets=assigned.filter(n=>n.fret>0).map(n=>n.fret);
            const lo=frets.length?Math.min(...frets):0,hi=frets.length?Math.max(...frets):0;
            const cost=assigned.filter(n=>n.string<0).length*10000+Math.max(0,hi-lo-4)*200+hi-lo+Math.abs(lo-position)*2+hi*.2;
            if(cost<bestCost){bestCost=cost;best=assigned.slice();}return;
          }
          const n=fresh[i];
          tuning.forEach((open,string)=>{const fret=n.midi-open;if(fret>=0&&fret<=19&&!used.has(string)){used.add(string);search(i+1,[...assigned,{...n,string,fret}],used);used.delete(string);}});
          search(i+1,[...assigned,{...n,string:-1,fret:null}],used);
        }
        search(0,[],new Set(held.map(h=>h.string)));
        g.notes=[...fixed,...best];
        best.filter(n=>n.string>=0).forEach(n=>held.push({...n,end:now+n.dur}));
        const fretted=g.notes.filter(n=>n.fret>0);if(fretted.length)position=Math.min(...fretted.map(n=>n.fret));
      });
      return result;
    });
  }
  root.GuitarTablature={finger};
})(typeof window!=='undefined'?window:globalThis);
