(function () {
  'use strict';
  const canvas = document.getElementById('sculpt-canvas');
  if (!canvas) return;
  const surface = window.SimKit.canvas2d(canvas, { box: canvas.parentElement, height: 400, dpr: 2 });
  const ctx = surface.ctx;
  const radius = document.getElementById('sculpt-radius');
  const strength = document.getElementById('sculpt-strength');
  const symmetry = document.getElementById('sculpt-symmetry');
  const dyntopo = document.getElementById('sculpt-dyntopo');
  const status = document.getElementById('sculpt-canvas-status');
  const density = document.getElementById('sculpt-density');
  const size = 96;
  let height = new Float32Array(size * size);
  let mask = new Float32Array(size * size);
  let brush = 'clay';
  let drawing = false;
  let last = null;
  let strokeStart = null;
  let strokes = 0;
  let choices = 0;
  let currentStage = 'form';
  const usedBrushes = new Set();
  const history = [];
  const stages = {
    form: { title: '1. Establish the silhouette', copy: 'Use Clay Strip or Grab with a broad radius. Make at least three deliberate strokes before checking your work.' },
    structure: { title: '2. Organize the surface', copy: 'Use Smooth to settle lumps, then decide whether adaptive topology is needed before carving.' },
    detail: { title: '3. Add one controlled detail', copy: 'Use Crease or Inflate with a smaller radius. Protect one area with Mask, then check the stage.' }
  };

  const brushCopy = { clay: 'Build broad, overlapping planes; cross the form instead of tracing its outline.', grab: 'Pull the silhouette with a long drag. Use a large radius for proportion changes.', smooth: 'Settle high-frequency lumps without erasing the main form.', crease: 'Cut a narrow valley. Small radius and moderate strength keep it controlled.', inflate: 'Push evenly outward around the cursor.', mask: 'Paint protection. Other brushes cannot change orange-hatched areas.' };

  function reset() {
    height = new Float32Array(size * size); mask = new Float32Array(size * size);
    for (let y=0;y<size;y++) for(let x=0;x<size;x++) { const dx=(x-size/2)/(size*.42), dy=(y-size/2)/(size*.42); height[y*size+x]=Math.max(0,1-dx*dx-dy*dy); }
    history.length=0;strokes=0;choices=0;usedBrushes.clear();currentStage='form';updateStage();updateLog();document.querySelectorAll('[data-sculpt-stage]').forEach(x=>x.classList.remove('is-complete'));
    render();
  }
  function snapshot(){history.push({height:height.slice(),mask:mask.slice()});if(history.length>12)history.shift();document.getElementById('sculpt-undo').disabled=false;}
  function updateLog(){document.getElementById('sculpt-strokes').textContent=strokes;document.getElementById('sculpt-tools').textContent=usedBrushes.size;document.getElementById('sculpt-decisions').textContent=choices;}
  function updateStage(){const brief=stages[currentStage];document.getElementById('sculpt-brief-title').textContent=brief.title;document.getElementById('sculpt-brief-copy').textContent=brief.copy;document.querySelectorAll('[data-sculpt-stage]').forEach(x=>{const active=x.dataset.sculptStage===currentStage;x.classList.toggle('is-current',active);x.querySelector('button').toggleAttribute('aria-current',active);});}
  function applyAt(px, py, from) {
    const rect=canvas.getBoundingClientRect(), gx=px/rect.width*size, gy=py/rect.height*size;
    const r=Number(radius.value)/rect.width*size, power=Number(strength.value)/100;
    const points=symmetry.checked?[gx,size-gx]:[gx];
    points.forEach(cx=>{
      for(let y=Math.max(1,Math.floor(gy-r));y<Math.min(size-1,Math.ceil(gy+r));y++) for(let x=Math.max(1,Math.floor(cx-r));x<Math.min(size-1,Math.ceil(cx+r));x++){
        const d=Math.hypot(x-cx,y-gy)/r;if(d>1)continue;const fall=Math.pow(1-d,1.7),i=y*size+x;
        if(brush==='mask'){mask[i]=Math.min(1,mask[i]+fall*.16);continue;} if(mask[i]>.35)continue;
        if(brush==='smooth'){const avg=(height[i-1]+height[i+1]+height[i-size]+height[i+size])/4;height[i]+=(avg-height[i])*fall*.22*power;}
        else if(brush==='crease') height[i]-=fall*fall*.045*power;
        else if(brush==='inflate') height[i]+=fall*.028*power;
        else if(brush==='grab'&&from){const shift=(px-from.x)/rect.width*size*.04; height[i]+=shift*fall*power;}
        else height[i]+=fall*(.02+(Math.sin((x+y)*.7)*.004))*power;
      }
    });
    if(dyntopo.checked) density.textContent='Mesh density: adaptive · detail concentrated under the stroke';
  }
  function render(){
    const w=surface.width,h=surface.height,img=document.createElement('canvas');img.width=size;img.height=size;const ic=img.getContext('2d'),data=ic.createImageData(size,size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,p=i*4,hv=Math.max(0,height[i]);const nx=height[i-1]||hv,nz=height[i-size]||hv,light=Math.max(.2,Math.min(1,.58+(hv-nx)*5+(hv-nz)*4));data.data[p]=96+light*92;data.data[p+1]=86+light*82;data.data[p+2]=80+light*72;data.data[p+3]=hv>.015?255:0;if(mask[i]>.2){data.data[p]=220;data.data[p+1]=92;data.data[p+2]=34;}}
    ic.putImageData(data,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#17191c';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.drawImage(img,0,0,w,h);
  }
  function point(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  canvas.addEventListener('pointerdown',e=>{snapshot();drawing=true;strokeStart=point(e);last=strokeStart;canvas.setPointerCapture(e.pointerId);applyAt(last.x,last.y,null);render();});
  canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);applyAt(p.x,p.y,last);last=p;render();});
  canvas.addEventListener('pointerup',()=>{if(drawing){strokes++;usedBrushes.add(brush);updateLog();}drawing=false;last=null;strokeStart=null;});
  document.querySelectorAll('[data-sculpt-brush]').forEach(b=>b.addEventListener('click',()=>{if(brush!==b.dataset.sculptBrush)choices++;brush=b.dataset.sculptBrush;usedBrushes.add(brush);updateLog();document.querySelectorAll('[data-sculpt-brush]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));status.textContent=brushCopy[brush];}));
  [radius,strength].forEach(input=>input.addEventListener('input',()=>{document.getElementById('sculpt-radius-out').textContent=radius.value+' px';document.getElementById('sculpt-strength-out').textContent=strength.value+'%';}));
  dyntopo.addEventListener('change',()=>{choices++;updateLog();density.textContent=dyntopo.checked?'Mesh density: adaptive · detail concentrated under the stroke':'Mesh density: medium · 2,400 vertices';});
  symmetry.addEventListener('change',()=>{choices++;updateLog();});
  document.getElementById('sculpt-reset').addEventListener('click',reset);
  document.getElementById('sculpt-undo').addEventListener('click',()=>{const previous=history.pop();if(!previous)return;height=previous.height;mask=previous.mask;strokes=Math.max(0,strokes-1);updateLog();render();document.getElementById('sculpt-undo').disabled=history.length===0;status.textContent='Last stroke undone. Compare the silhouette before drawing again.';});
  document.querySelectorAll('[data-sculpt-stage] button').forEach(b=>b.addEventListener('click',()=>{currentStage=b.parentElement.dataset.sculptStage;updateStage();document.getElementById('sculpt-coach').textContent='Stage selected. '+stages[currentStage].copy;}));
  document.getElementById('sculpt-check-stage').addEventListener('click',()=>{let pass=false,feedback='';if(currentStage==='form'){pass=strokes>=3&&(usedBrushes.has('clay')||usedBrushes.has('grab'))&&Number(radius.value)>=55;feedback=pass?'Large-form evidence found: broad tool, broad radius, repeated strokes. Now settle the structure.':'Keep blocking in: use Clay Strip or Grab, set Radius to 55 px or more, and make at least three strokes.';}else if(currentStage==='structure'){pass=usedBrushes.has('smooth')&&(dyntopo.checked||choices>=2);feedback=pass?'You revised the surface instead of only adding to it. Move to one intentional detail.':'Use Smooth, then make a topology decision: toggle Dynamic Topology if the form needs local resolution.';}else{pass=(usedBrushes.has('crease')||usedBrushes.has('inflate'))&&usedBrushes.has('mask')&&Number(radius.value)<=50;feedback=pass?'Detail followed form and structure. Your log shows a disciplined sculpting sequence.':'Use Crease or Inflate below 50 px, and try Mask once to protect an area.';}document.getElementById('sculpt-coach').textContent=feedback;if(pass){const item=document.querySelector('[data-sculpt-stage="'+currentStage+'"]');item.classList.add('is-complete');const order=['form','structure','detail'],next=order[order.indexOf(currentStage)+1];if(next){currentStage=next;updateStage();}}});
  const repairs={faceted:'Cause: the mesh lacks geometry for the groove. Repair: enable Dynamic Topology or remesh at a smaller voxel size.',frozen:'Cause: low density, zero strength, or an active mask. Repair: raise Strength, add geometry, then clear unintended masks.',lumpy:'Cause: small-radius detail arrived before the large form. Repair: choose Smooth with a broad radius, then rebuild the silhouette.'};
  document.querySelectorAll('[data-sculpt-problem]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('sculpt-diagnostic-feedback').textContent=repairs[b.dataset.sculptProblem];if(b.dataset.sculptProblem==='faceted'){dyntopo.checked=true;dyntopo.dispatchEvent(new Event('change'));}if(b.dataset.sculptProblem==='lumpy'){document.querySelector('[data-sculpt-brush="smooth"]').click();radius.value=80;radius.dispatchEvent(new Event('input'));}if(b.dataset.sculptProblem==='frozen'){strength.value=55;strength.dispatchEvent(new Event('input'));mask.fill(0);}}));
  window.addEventListener('resize', () => requestAnimationFrame(render)); reset();
}());
