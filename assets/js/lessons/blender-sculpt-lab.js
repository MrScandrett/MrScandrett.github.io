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

  const brushCopy = { clay: 'Build broad, overlapping planes; cross the form instead of tracing its outline.', grab: 'Pull the silhouette with a long drag. Use a large radius for proportion changes.', smooth: 'Settle high-frequency lumps without erasing the main form.', crease: 'Cut a narrow valley. Small radius and moderate strength keep it controlled.', inflate: 'Push evenly outward around the cursor.', mask: 'Paint protection. Other brushes cannot change orange-hatched areas.' };

  function reset() {
    height = new Float32Array(size * size); mask = new Float32Array(size * size);
    for (let y=0;y<size;y++) for(let x=0;x<size;x++) { const dx=(x-size/2)/(size*.42), dy=(y-size/2)/(size*.42); height[y*size+x]=Math.max(0,1-dx*dx-dy*dy); }
    render();
  }
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
  canvas.addEventListener('pointerdown',e=>{drawing=true;last=point(e);canvas.setPointerCapture(e.pointerId);applyAt(last.x,last.y,null);render();});
  canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);applyAt(p.x,p.y,last);last=p;render();});
  canvas.addEventListener('pointerup',()=>{drawing=false;last=null;});
  document.querySelectorAll('[data-sculpt-brush]').forEach(b=>b.addEventListener('click',()=>{brush=b.dataset.sculptBrush;document.querySelectorAll('[data-sculpt-brush]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));status.textContent=brushCopy[brush];}));
  [radius,strength].forEach(input=>input.addEventListener('input',()=>{document.getElementById('sculpt-radius-out').textContent=radius.value+' px';document.getElementById('sculpt-strength-out').textContent=strength.value+'%';}));
  dyntopo.addEventListener('change',()=>{density.textContent=dyntopo.checked?'Mesh density: adaptive · detail concentrated under the stroke':'Mesh density: medium · 2,400 vertices';});
  document.getElementById('sculpt-reset').addEventListener('click',reset);
  const repairs={faceted:'Cause: the mesh lacks geometry for the groove. Repair: enable Dynamic Topology or remesh at a smaller voxel size.',frozen:'Cause: low density, zero strength, or an active mask. Repair: raise Strength, add geometry, then clear unintended masks.',lumpy:'Cause: small-radius detail arrived before the large form. Repair: choose Smooth with a broad radius, then rebuild the silhouette.'};
  document.querySelectorAll('[data-sculpt-problem]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('sculpt-diagnostic-feedback').textContent=repairs[b.dataset.sculptProblem];if(b.dataset.sculptProblem==='faceted'){dyntopo.checked=true;dyntopo.dispatchEvent(new Event('change'));}if(b.dataset.sculptProblem==='lumpy'){document.querySelector('[data-sculpt-brush="smooth"]').click();radius.value=80;radius.dispatchEvent(new Event('input'));}if(b.dataset.sculptProblem==='frozen'){strength.value=55;strength.dispatchEvent(new Event('input'));mask.fill(0);}}));
  window.addEventListener('resize', () => requestAnimationFrame(render)); reset();
}());
