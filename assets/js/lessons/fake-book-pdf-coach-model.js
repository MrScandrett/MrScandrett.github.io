/* Geometry and example matching for human-reviewed PDF transcriptions. */
(function (global) {
  'use strict';
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  function boxValid(b) { return b && ['x','y','w','h'].every(k => finite(b[k])) && b.x >= 0 && b.y >= 0 && b.w >= .005 && b.h >= .005 && b.x + b.w <= 1.00001 && b.y + b.h <= 1.00001; }
  function box(a, b) {
    const x = Math.max(0, Math.min(1, Math.min(a.x, b.x))), y = Math.max(0, Math.min(1, Math.min(a.y, b.y)));
    return { x, y, w: Math.min(1 - x, Math.abs(b.x - a.x)), h: Math.min(1 - y, Math.abs(b.y - a.y)) };
  }
  function move(b, dx, dy) { return { ...b, x: Math.max(0, Math.min(1-b.w,b.x+dx)), y: Math.max(0, Math.min(1-b.h,b.y+dy)) }; }
  function staffValid(s) { return s && finite(s.top) && finite(s.bottom) && s.top >= 0 && s.bottom <= 1 && s.bottom - s.top > .03; }
  function staff(data, width, height) {
    const rows = [];
    for (let y=0;y<height;y++) { let dark=0; for(let x=0;x<width;x++) { const i=(y*width+x)*4; if(data[i]+data[i+1]+data[i+2]<450) dark++; } rows[y]=dark/width; }
    let best;
    for(let gap=4;gap<=Math.min(40,height/5);gap++) for(let top=0;top+gap*4<height;top++) {
      let score=0, minimum=1;
      for(let l=0;l<5;l++) { const y=top+l*gap; const strength=Math.max(rows[y],rows[Math.max(0,y-1)]||0,rows[Math.min(height-1,y+1)]||0); score+=strength; minimum=Math.min(minimum,strength); }
      if(minimum>.18 && (!best || score>best.score)) best={ top:top/height,bottom:(top+4*gap)/height,score };
    }
    return best && {top:best.top,bottom:best.bottom};
  }
  const major={C:0,G:1,D:2,A:3,E:4,B:5,'F#':6,'C#':7,F:-1,Bb:-2,Eb:-3,Ab:-4,Db:-5,Gb:-6,Cb:-7};
  const minor={A:0,E:1,B:2,'F#':3,'C#':4,'G#':5,'D#':6,'A#':7,D:-1,G:-2,C:-3,F:-4,Bb:-5,Eb:-6,Ab:-7};
  function pitch(y, s, clef, key, mode, accidental) {
    if(!staffValid(s)) throw new Error('Mark the top and bottom staff lines first.');
    const step=Math.round((s.bottom-y)*8/(s.bottom-s.top));
    const d=(clef==='bass'?2*7+4:4*7+2)+step, letter='CDEFGAB'[((d%7)+7)%7], octave=Math.floor(d/7);
    if(octave<0 || octave>9) throw new Error('Click closer to the calibrated staff.');
    let acc=accidental;
    if(acc==='key' || acc===undefined) { const count=(mode==='minor'?minor:major)[key]||0; acc=count>0 && 'FCGDAEB'.slice(0,count).includes(letter)?'#':count<0 && 'BEADGCF'.slice(0,-count).includes(letter)?'b':''; }
    return letter+acc+octave;
  }
  function similarity(a,b) {
    if(typeof a!=='string' || typeof b!=='string' || a.length!==b.length) return 0;
    const aa=atob(a),bb=atob(b); let same=0,na=0,nb=0;
    const bits=n=>{let c=0;while(n){n&=n-1;c++;}return c;};
    for(let i=0;i<aa.length;i++) { const x=aa.charCodeAt(i),y=bb.charCodeAt(i);same+=bits(x&y);na+=bits(x);nb+=bits(y); }
    return na>8 && nb>8 ? same/Math.sqrt(na*nb) : 0;
  }
  function match(signature, examples, context) {
    let best;
    examples.forEach(e=>{ if(e.key!==context.key || e.mode!==context.mode || e.meter!==context.meter || e.clef!==context.clef) return;
      const score=similarity(signature,e.signature); if(!best || score>best.score) best={example:e,score}; });
    return best && best.score>=.82 ? best : null;
  }
  function validateSources(drafts, pages) {
    return drafts.every(d=>d.bars.every(b=>!b.source || (boxValid(b.source.box) && Number.isInteger(b.source.page) && b.source.page>=1 && b.source.page<=pages && (!b.source.staff || staffValid(b.source.staff)))));
  }
  global.FakeBookPDFCoachModel={boxValid,box,move,staffValid,staff,pitch,similarity,match,validateSources};
})(typeof window!=='undefined'?window:globalThis);
