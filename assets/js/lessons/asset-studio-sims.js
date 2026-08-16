(() => {
  if (!window.SimKit) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const q = (root, selector) => root.querySelector(selector);
  const qa = (root, selector) => [...root.querySelectorAll(selector)];
  let theme = SimKit.theme.colors();
  const redrawers = [];
  SimKit.theme.onChange(colors => { theme = colors; redrawers.forEach(draw => draw()); });

  function setupCanvas(root, draw) {
    const canvas = q(root, 'canvas');
    const stage = q(root, '.asset-sim-stage');
    const surface = SimKit.canvas2d(canvas, { box: stage, dpr: 2, onResize: draw });
    redrawers.push(draw);
    return { canvas, surface, ctx: surface.ctx };
  }

  function line(ctx, x1, y1, x2, y2, color, width = 2) {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke();
  }

  function updateMeter(root, score, message) {
    const meter = q(root,'.asset-meter span');
    if (meter) meter.style.width = `${clamp(score,0,100)}%`;
    const scoreLabel = q(root,'.asset-sim-score');
    if (scoreLabel) scoreLabel.textContent = `${Math.round(score)} / 100`;
    if (message) q(root,'.asset-sim-status').innerHTML = message;
  }

  // 01 · Texture tiling and map authoring
  function initTexture(root) {
    const state = { repair: 24, scale: 55, wear: 38, light: 35, map: 'lit', brief: 'bench', placement: 'random' };
    const visited = new Set(['lit']);
    const briefs = {
      bench: { label: 'WORKSHOP BENCH', targetScale: 55, placement: 'contact', why: 'Hands and tools polish repeated contact zones.' },
      crate: { label: 'PAINTED CRATE', targetScale: 42, placement: 'edges', why: 'Transport chips corners and exposed edges first.' },
      wall: { label: 'DAMP WALL', targetScale: 70, placement: 'low', why: 'Moisture collects low and darkens recessed areas.' }
    };
    let api;
    const fract = value => value - Math.floor(value);
    const hash = (x,y,seed=0) => fract(Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453);
    const smooth = (a,b,t) => a+(b-a)*(t*t*(3-2*t));
    const noise = (x,y,seed=0) => {
      const ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y);
      return smooth(smooth(hash(ix,iy,seed),hash(ix+1,iy,seed),fx),smooth(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),fx),fy);
    };
    const wearMask = (u,v) => {
      if (state.placement==='contact') return clamp(Math.exp(-((u-.52)**2/.12+(v-.6)**2/.035))*.8+Math.exp(-((u-.18)**2+(v-.22)**2)/.025)*.45,0,1);
      if (state.placement==='edges') return clamp(Math.max(Math.exp(-Math.min(u,1-u)*22),Math.exp(-Math.min(v,1-v)*22))*.85+noise(u*5,v*5,4)*.18,0,1);
      if (state.placement==='low') return clamp((v-.45)*1.7+noise(u*5,v*3,7)*.35,0,1);
      return noise(u*8,v*8,9)*.78;
    };
    const sample = (u,v,view) => {
      const detail=clamp(55/state.scale,.55,2.4),su=u*detail,sv=v*detail;
      const seam=(1-state.repair/100)*Math.max(Math.exp(-Math.min(u,1-u)*42),Math.exp(-Math.min(v,1-v)*42));
      const fine=noise(su*18,sv*18,2)-.5, broad=noise(su*3,sv*3,1)-.5, wear=wearMask(u,v)*(state.wear/100);
      let r,g,b,height,rough;
      if(state.brief==='bench'){
        const grain=Math.sin((su*10+Math.sin(sv*6.283)*.55)*6.283)*.5+.5;
        const joint=Math.exp(-Math.min(fract(sv*3.2),1-fract(sv*3.2))*55);
        r=133+grain*30+broad*20+wear*26;g=82+grain*17+broad*11+wear*18;b=48+grain*8+broad*8+wear*11;
        height=(grain-.5)*.12-joint*.32+fine*.04;rough=.58+fine*.18-wear*.38+joint*.14;
      } else if(state.brief==='crate'){
        const scrape=Math.max(0,Math.sin((su*2.1+sv*4.4)*18+noise(su*5,sv*5,3)*4))**18;
        r=48+broad*14+wear*78;g=116+broad*18+wear*38;b=126+broad*17+wear*12;
        height=broad*.12-scrape*wear*.35;rough=.46+fine*.14+wear*.32;
      } else {
        const pits=noise(su*11,sv*11,6),mortar=Math.exp(-Math.min(fract(sv*4),1-fract(sv*4))*42);
        r=169+broad*23-wear*54;g=165+broad*20-wear*39;b=151+broad*18-wear*28;
        height=(pits-.5)*.22-mortar*.22;rough=.76+fine*.1+wear*.14;
      }
      r-=seam*48;g-=seam*34;b-=seam*26;height-=seam*.34;rough=clamp(rough+seam*.2,0,1);
      const nx=Math.sin((u*6.283)*5+height*8)*.18,ny=Math.cos((v*6.283)*4-height*7)*.16;
      if(view==='base'||view==='repeat') return [r,g,b];
      if(view==='rough'){const q=rough*255;return[q,q,q];}
      if(view==='normal') return [128+nx*390,128-ny*390,235-height*35];
      const angle=state.light*Math.PI/180,lx=Math.cos(angle),ly=Math.sin(angle),diff=clamp(.67+nx*lx+ny*ly,0,1);
      const sweep=clamp(.28+Math.pow(Math.max(0,1-Math.abs(u-(.15+.7*(state.light/180)))*3.2),5)*(1-rough)*1.6,0,1.6);
      return [r*(diff+sweep),g*(diff+sweep),b*(diff+sweep)];
    };
    const makeTile = (view,size=150) => {
      const tile=document.createElement('canvas');tile.width=tile.height=size;const tileCtx=tile.getContext('2d'),image=tileCtx.createImageData(size,size),data=image.data;
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const color=sample(x/(size-1),y/(size-1),view),i=(y*size+x)*4;
        data[i]=clamp(color[0],0,255);data[i+1]=clamp(color[1],0,255);data[i+2]=clamp(color[2],0,255);data[i+3]=255;
      }
      tileCtx.putImageData(image,0,0);return tile;
    };
    const draw = () => {
      if (!api) return;
      const {ctx} = api, w = api.surface.width, h = api.surface.height;
      ctx.clearRect(0,0,w,h);ctx.fillStyle='#0d202a';ctx.fillRect(0,0,w,h);
      const pad=Math.max(18,Math.min(30,w*.045)),labelY=26,box={x:pad,y:44,w:w-pad*2,h:h-78};
      ctx.fillStyle='#92bdca';ctx.font='700 11px JetBrains Mono';ctx.fillText(`${briefs[state.brief].label}  /  ${state.map.toUpperCase()}`,pad,labelY);
      ctx.save();ctx.beginPath();ctx.roundRect(box.x,box.y,box.w,box.h,10);ctx.clip();
      if(state.map==='repeat'){
        const size=Math.min(box.w/3,box.h/3),ox=box.x+(box.w-size*3)/2,oy=box.y+(box.h-size*3)/2,tile=makeTile('repeat');
        for(let row=0;row<3;row++)for(let col=0;col<3;col++)ctx.drawImage(tile,ox+col*size,oy+row*size,size,size);
        ctx.strokeStyle='rgba(255,194,143,.88)';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.strokeRect(ox+size,oy+size,size,size);ctx.setLineDash([]);
      } else {
        const tile=makeTile(state.map),size=Math.min(box.w,box.h),x=box.x+(box.w-size)/2,y=box.y+(box.h-size)/2;
        ctx.fillStyle='#18313e';ctx.fillRect(box.x,box.y,box.w,box.h);ctx.drawImage(tile,x,y,size,size);
        if(state.map==='lit'){const grad=ctx.createLinearGradient(x,y,x+size,y);grad.addColorStop(0,'rgba(6,18,24,.34)');grad.addColorStop(.5,'rgba(255,236,190,.06)');grad.addColorStop(1,'rgba(5,16,22,.24)');ctx.fillStyle=grad;ctx.fillRect(x,y,size,size);}
      }
      ctx.restore();ctx.strokeStyle='rgba(146,189,202,.36)';ctx.lineWidth=1;ctx.strokeRect(box.x+.5,box.y+.5,box.w-1,box.h-1);
      const brief=briefs[state.brief],scaleScore=clamp(100-Math.abs(state.scale-brief.targetScale)*2.5,0,100),wearScore=clamp(100-Math.abs(state.wear-42)*2.3,0,100),inspection=['base','rough','normal','repeat'].filter(view=>visited.has(view)).length;
      const score=state.repair*.4+(state.placement===brief.placement?25:0)+scaleScore*.15+wearScore*.1+inspection/4*10;
      let msg;
      if(state.repair<76) msg='<strong>Tile edge detected:</strong> Blend the border, then confirm it in the 3 × 3 repeat.';
      else if(state.placement!==brief.placement) msg=`<strong>Wear needs a cause:</strong> ${brief.why}`;
      else if(scaleScore<72) msg=`<strong>Scale mismatch:</strong> Move the pattern toward ${brief.targetScale} cm for this brief.`;
      else if(state.wear<25||state.wear>62) msg='<strong>Restraint check:</strong> Use enough wear to read, but keep the clean core material visible.';
      else if(inspection<4) msg=`<strong>Inspect the data:</strong> Check ${['base','rough','normal','repeat'].filter(view=>!visited.has(view)).join(', ')} before approval.`;
      else msg='<strong>Material approved:</strong> The maps agree, the repeat is clean, and the wear explains the object’s history.';
      updateMeter(root,score,msg);
    };
    api=setupCanvas(root,draw);
    qa(root,'input[type="range"]').forEach(input=>input.addEventListener('input',()=>{state[input.dataset.control]=+input.value;const suffix=input.dataset.control==='scale'?' cm':input.dataset.control==='light'?'°':'%';q(root,`output[for="${input.id}"]`).textContent=input.value+suffix;draw();}));
    qa(root,'[data-map]').forEach(button=>button.addEventListener('click',()=>{state.map=button.dataset.map;visited.add(state.map);qa(root,'[data-map]').forEach(b=>b.classList.toggle('is-active',b===button));draw();}));
    qa(root,'[data-wear-place]').forEach(button=>button.addEventListener('click',()=>{state.placement=button.dataset.wearPlace;qa(root,'[data-wear-place]').forEach(b=>b.classList.toggle('is-active',b===button));draw();}));
    qa(root,'[data-texture-brief]').forEach(button=>button.addEventListener('click',()=>{state.brief=button.dataset.textureBrief;visited.clear();visited.add(state.map);qa(root,'[data-texture-brief]').forEach(b=>b.classList.toggle('is-active',b===button));draw();}));
    api.canvas.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const input=q(root,'[data-control="light"]'),delta=event.key==='ArrowLeft'?-5:5;input.value=clamp(+input.value+delta,0,180);input.dispatchEvent(new Event('input'));}});
    draw();
  }

  // 02 · Furniture blockout and proportion checking
  function initFurniture(root) {
    const state={width:48,height:45,back:52,leg:4,bevel:3}; let api;
    const draw=()=>{
      if(!api)return;const {ctx}=api,w=api.surface.width,h=api.surface.height;ctx.clearRect(0,0,w,h);ctx.fillStyle=theme.cardBg;ctx.fillRect(0,0,w,h);
      const floor=h*.84;line(ctx,w*.08,floor,w*.94,floor,'#76909c',2);
      const humanX=w*.16, humanH=Math.min(h*.66,270);ctx.strokeStyle='#78909b';ctx.lineWidth=5;ctx.beginPath();ctx.arc(humanX,floor-humanH,12,0,Math.PI*2);ctx.stroke();line(ctx,humanX,floor-humanH+14,humanX,floor-70,'#78909b',5);line(ctx,humanX,floor-170,humanX-28,floor-105,'#78909b',5);line(ctx,humanX,floor-170,humanX+28,floor-105,'#78909b',5);line(ctx,humanX,floor-70,humanX-22,floor,'#78909b',5);line(ctx,humanX,floor-70,humanX+24,floor,'#78909b',5);
      ctx.fillStyle=theme.text;ctx.font='700 11px JetBrains Mono';ctx.fillText('1.75 m',humanX-22,floor+18);
      const cx=w*.62, scale=Math.min(w*.0085,5.1), seatW=state.width*scale, seatY=floor-state.height*scale, seatH=8+state.bevel*.8, legW=Math.max(4,state.leg*scale*.55), backH=state.back*scale;
      ctx.fillStyle='#b66f42';ctx.strokeStyle='#6d422d';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(cx-seatW/2,seatY-seatH/2,seatW,seatH,state.bevel);ctx.fill();ctx.stroke();
      for(const x of [cx-seatW*.38,cx+seatW*.38]){ctx.fillStyle='#75452e';ctx.fillRect(x-legW/2,seatY+seatH/2,legW,floor-seatY-seatH/2);}
      ctx.fillStyle='#a7613a';ctx.beginPath();ctx.roundRect(cx-seatW*.46,seatY-backH,seatW*.16,backH,Math.max(1,state.bevel));ctx.fill();ctx.beginPath();ctx.roundRect(cx+seatW*.30,seatY-backH,seatW*.16,backH,Math.max(1,state.bevel));ctx.fill();ctx.beginPath();ctx.roundRect(cx-seatW*.46,seatY-backH,seatW*.92,12+state.bevel,Math.max(1,state.bevel));ctx.fill();
      ctx.strokeStyle='#287ea8';ctx.lineWidth=1;ctx.setLineDash([4,3]);line(ctx,cx-seatW/2,seatY-18,cx+seatW/2,seatY-18,'#287ea8',1);line(ctx,cx+seatW/2+16,floor,cx+seatW/2+16,seatY,'#287ea8',1);ctx.setLineDash([]);ctx.fillStyle=theme.text;ctx.font='700 11px JetBrains Mono';ctx.fillText(`${state.width} cm`,cx-24,seatY-24);ctx.fillText(`${state.height} cm`,cx+seatW/2+22,(floor+seatY)/2);
      const tests=[state.width>=42&&state.width<=56,state.height>=40&&state.height<=50,state.back>=35&&state.back<=65,state.leg>=3&&state.leg<=7,state.bevel>=2&&state.bevel<=6];const score=tests.filter(Boolean).length/5*100;
      const msg=!tests[1]?'<strong>Ergonomics:</strong> Adjust seat height into the 40–50 cm target band.':!tests[0]?'<strong>Proportion:</strong> Adjust seat width into the 42–56 cm target band.':score===100?'<strong>Blockout approved:</strong> Scale, silhouette, support thickness, and edge treatment are production-ready.':'<strong>Refine:</strong> Check back height, leg thickness, and bevel against the target bands.';updateMeter(root,score,msg);
    };api=setupCanvas(root,draw);qa(root,'input').forEach(input=>input.addEventListener('input',()=>{state[input.dataset.control]=+input.value;q(root,`output[for="${input.id}"]`).textContent=input.value;draw();}));draw();
  }

  // 03 · Top-down modular room editor
  function initRoom(root) {
    const cols=10,rows=8,cells=Array(cols*rows).fill('empty');let tool='floor',cursor={x:1,y:1},api;
    const colors={empty:'rgba(65,92,107,.08)',floor:'#b8ced7',wall:'#345364',door:'#f08b46'};
    const draw=()=>{if(!api)return;const {ctx}=api,w=api.surface.width,h=api.surface.height,cell=Math.min((w-32)/cols,(h-32)/rows),ox=(w-cell*cols)/2,oy=(h-cell*rows)/2;ctx.clearRect(0,0,w,h);ctx.fillStyle=theme.cardBg;ctx.fillRect(0,0,w,h);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const type=cells[y*cols+x];ctx.fillStyle=colors[type];ctx.fillRect(ox+x*cell+1,oy+y*cell+1,cell-2,cell-2);ctx.strokeStyle='rgba(42,75,92,.28)';ctx.strokeRect(ox+x*cell+.5,oy+y*cell+.5,cell-1,cell-1);if(type==='door'){ctx.strokeStyle='#fff3e7';ctx.lineWidth=3;ctx.beginPath();ctx.arc(ox+x*cell+cell*.2,oy+y*cell+cell*.8,cell*.58,-Math.PI/2,0);ctx.stroke();}}
      ctx.strokeStyle='#f08b46';ctx.lineWidth=3;ctx.strokeRect(ox+cursor.x*cell+2,oy+cursor.y*cell+2,cell-4,cell-4);ctx.fillStyle=theme.text;ctx.font='700 11px JetBrains Mono';ctx.fillText('CLICK OR USE ARROWS + SPACE',ox,Math.max(14,oy-8));};
    api=setupCanvas(root,draw);const canvas=api.canvas;
    canvas.addEventListener('pointerdown',event=>{const rect=canvas.getBoundingClientRect(),w=api.surface.width,h=api.surface.height,cell=Math.min((w-32)/cols,(h-32)/rows),ox=(w-cell*cols)/2,oy=(h-cell*rows)/2,x=Math.floor((event.clientX-rect.left-ox)/cell),y=Math.floor((event.clientY-rect.top-oy)/cell);if(x>=0&&x<cols&&y>=0&&y<rows){cells[y*cols+x]=tool;draw();}});
    canvas.addEventListener('keydown',event=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(moves[event.key]){event.preventDefault();cursor.x=clamp(cursor.x+moves[event.key][0],0,cols-1);cursor.y=clamp(cursor.y+moves[event.key][1],0,rows-1);draw();}else if(event.key===' '||event.key==='Enter'){event.preventDefault();cells[cursor.y*cols+cursor.x]=tool;draw();}else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();cells[cursor.y*cols+cursor.x]='empty';draw();}});
    qa(root,'[data-room-tool]').forEach(button=>button.addEventListener('click',()=>{tool=button.dataset.roomTool;qa(root,'[data-room-tool]').forEach(b=>b.classList.toggle('is-active',b===button));}));
    q(root,'[data-room-reset]').addEventListener('click',()=>{cells.fill('empty');updateMeter(root,0,'<strong>Empty plan:</strong> Place floors, surround them with walls, and include exactly one doorway.');draw();});
    q(root,'[data-room-check]').addEventListener('click',()=>{const floorIds=cells.map((v,i)=>v==='floor'?i:-1).filter(i=>i>=0),walls=cells.filter(v=>v==='wall').length,doors=cells.filter(v=>v==='door').length;let connected=0;if(floorIds.length){const seen=new Set([floorIds[0]]),queue=[floorIds[0]];while(queue.length){const i=queue.shift(),x=i%cols,y=Math.floor(i/cols);connected++;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,ni=ny*cols+nx;if(nx>=0&&nx<cols&&ny>=0&&ny<rows&&cells[ni]==='floor'&&!seen.has(ni)){seen.add(ni);queue.push(ni);}}}}const tests=[floorIds.length>=12,walls>=10,doors===1,connected===floorIds.length&&floorIds.length>0,!floorIds.some(i=>i<cols||i>=cols*(rows-1)||i%cols===0||i%cols===cols-1)];const score=tests.filter(Boolean).length/5*100;const labels=['12+ floor tiles','10+ wall modules','exactly one door','one connected floor area','floor kept off outer boundary'];const missing=labels.filter((_,i)=>!tests[i]);updateMeter(root,score,score===100?'<strong>Room validated:</strong> The plan is connected, bounded, and has one clear entrance.':`<strong>Revise:</strong> ${missing.join('; ')}.`);});draw();
  }

  // 04 · Draggable UV packing board
  function initUv(root) {
    const original=[{x:.05,y:.05,w:.42,h:.28},{x:.38,y:.15,w:.35,h:.34},{x:.14,y:.48,w:.30,h:.38},{x:.55,y:.54,w:.38,h:.20},{x:.72,y:.30,w:.22,h:.31}];let islands=original.map(o=>({...o})),selected=0,drag=null,api;
    const box=()=>{const s=Math.min(api.surface.width*.78,api.surface.height*.82),x=(api.surface.width-s)/2,y=(api.surface.height-s)/2;return{x,y,s};};
    const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    const draw=()=>{if(!api)return;const {ctx}=api,{x,y,s}=box();ctx.clearRect(0,0,api.surface.width,api.surface.height);ctx.fillStyle=theme.cardBg;ctx.fillRect(0,0,api.surface.width,api.surface.height);ctx.fillStyle='#bacbd3';ctx.fillRect(x,y,s,s);for(let i=0;i<=8;i++){line(ctx,x+i*s/8,y,x+i*s/8,y+s,'rgba(31,65,82,.16)',1);line(ctx,x,y+i*s/8,x+s,y+i*s/8,'rgba(31,65,82,.16)',1);}islands.forEach((o,i)=>{const bad=islands.some((p,j)=>j!==i&&overlap(o,p));ctx.fillStyle=bad?'rgba(215,96,91,.72)':i===selected?'rgba(240,139,70,.78)':'rgba(40,126,168,.65)';ctx.strokeStyle=i===selected?'#fff':'#244657';ctx.lineWidth=i===selected?3:1.5;ctx.fillRect(x+o.x*s,y+o.y*s,o.w*s,o.h*s);ctx.strokeRect(x+o.x*s,y+o.y*s,o.w*s,o.h*s);ctx.fillStyle='#fff';ctx.font='700 11px JetBrains Mono';ctx.fillText(`UV${i+1}`,x+o.x*s+6,y+o.y*s+16);});ctx.fillStyle=theme.text;ctx.font='700 11px JetBrains Mono';ctx.fillText('0–1 UV SPACE · DRAG ISLANDS',x,Math.max(14,y-8));};
    api=setupCanvas(root,draw);const canvas=api.canvas;
    canvas.addEventListener('pointerdown',e=>{const rect=canvas.getBoundingClientRect(),{x,y,s}=box(),px=(e.clientX-rect.left-x)/s,py=(e.clientY-rect.top-y)/s;for(let i=islands.length-1;i>=0;i--){const o=islands[i];if(px>=o.x&&px<=o.x+o.w&&py>=o.y&&py<=o.y+o.h){selected=i;drag={dx:px-o.x,dy:py-o.y};canvas.setPointerCapture(e.pointerId);draw();break;}}});
    canvas.addEventListener('pointermove',e=>{if(!drag)return;const rect=canvas.getBoundingClientRect(),{x,y,s}=box(),o=islands[selected];o.x=(e.clientX-rect.left-x)/s-drag.dx;o.y=(e.clientY-rect.top-y)/s-drag.dy;draw();});canvas.addEventListener('pointerup',()=>{drag=null;});
    canvas.addEventListener('keydown',event=>{const moves={ArrowLeft:[-.02,0],ArrowRight:[.02,0],ArrowUp:[0,-.02],ArrowDown:[0,.02]};if(moves[event.key]){event.preventDefault();islands[selected].x+=moves[event.key][0];islands[selected].y+=moves[event.key][1];draw();}else if(event.key==='['||event.key===']'){event.preventDefault();selected=(selected+(event.key===']'?1:islands.length-1))%islands.length;draw();}else if(event.key.toLowerCase()==='r'){event.preventDefault();q(root,'[data-uv-rotate]').click();}});
    q(root,'[data-uv-rotate]').addEventListener('click',()=>{const o=islands[selected];const oldWidth=o.w;o.w=o.h;o.h=oldWidth;draw();});q(root,'[data-uv-reset]').addEventListener('click',()=>{islands=original.map(o=>({...o}));draw();});
    q(root,'[data-uv-check]').addEventListener('click',()=>{const overlaps=islands.reduce((n,o,i)=>n+islands.slice(i+1).filter(p=>overlap(o,p)).length,0),outside=islands.filter(o=>o.x<.02||o.y<.02||o.x+o.w>.98||o.y+o.h>.98).length,checks=qa(root,'[data-export-check]:checked').length,score=Math.max(0,100-overlaps*22-outside*18-(3-checks)*12);updateMeter(root,score,score===100?'<strong>Export contract passed:</strong> Islands have padding, no overlap, and the handoff checks are complete.':`<strong>UV report:</strong> ${overlaps} overlap(s), ${outside} boundary/padding problem(s), ${3-checks} export check(s) missing.`);});draw();
  }

  // 05 · Vertex weighting and live elbow deformation
  // 06 · Four-pose walk-cycle editor and playback
  function initAnimation(root) {
    const names=['CONTACT','DOWN','PASSING','UP'];
    const defaults={height:.5,stride:.5,arm:.5,lift:.5};
    const styles={
      natural:{label:'NATURALISTIC',brief:'Prioritize observed weight, modest vertical motion, and continuous spacing.',frames:16,timing:'smooth',bg:'#bad1d8',grid:'rgba(22,55,70,.08)',ink:'#123642',limb:'#176f88',arm:'#b85861',accent:'#e77f42',head:'#d89550',torso:78,headSize:22,width:1,targets:[{height:.54,stride:.72,arm:.58,lift:.06},{height:.34,stride:.57,arm:.48,lift:.05},{height:.53,stride:.18,arm:.24,lift:.62},{height:.72,stride:.35,arm:.34,lift:.5}]},
      cartoon:{label:'CARTOON',brief:'Push contrast between squash and stretch, widen the silhouette, and favor generous arcs.',frames:16,timing:'elastic',bg:'#f4c99e',grid:'rgba(102,54,47,.09)',ink:'#482b3a',limb:'#177f92',arm:'#cc4f62',accent:'#f05b3c',head:'#f6a943',torso:67,headSize:28,width:1.2,targets:[{height:.62,stride:.98,arm:.96,lift:.03},{height:.04,stride:.7,arm:.76,lift:.02},{height:.5,stride:.08,arm:.38,lift:.96},{height:.98,stride:.45,arm:.62,lift:.82}]},
      anime:{label:'ANIME-INSPIRED',brief:'Hold strong silhouettes, then move decisively through short, designed transitions.',frames:12,timing:'held',bg:'#d9cae8',grid:'rgba(61,43,91,.08)',ink:'#302447',limb:'#4b5cba',arm:'#b44c82',accent:'#a64fc5',head:'#e6a87a',torso:74,headSize:24,width:.95,targets:[{height:.58,stride:.9,arm:.84,lift:.04},{height:.25,stride:.64,arm:.72,lift:.03},{height:.54,stride:.1,arm:.2,lift:.88},{height:.9,stride:.36,arm:.48,lift:.72}]},
      retro:{label:'LOW-POLY RETRO',brief:'Use stepped timing, angular joints, and economical poses that survive a distant game camera.',frames:8,timing:'stepped',bg:'#aebbe3',grid:'rgba(28,35,75,.13)',ink:'#222a54',limb:'#425ec2',arm:'#a94f73',accent:'#5f78de',head:'#d99667',torso:70,headSize:22,width:1.05,targets:[{height:.55,stride:.82,arm:.7,lift:.02},{height:.22,stride:.6,arm:.56,lift:.02},{height:.5,stride:.14,arm:.2,lift:.72},{height:.82,stride:.4,arm:.4,lift:.58}]}
    };
    let style='natural',poses=styles.natural.targets.map(()=>({...defaults})),selected=0,playing=false,time=0,speed=1,onion=true,arcs=true,api;
    const profile=()=>styles[style],targets=()=>profile().targets;
    const currentPose=()=>poses[selected];
    const ease=t=>t*t*(3-2*t);
    const timing=t=>profile().timing==='held'?(t<.62?0:ease((t-.62)/.38)):profile().timing==='stepped'?Math.floor(t*3)/3:profile().timing==='elastic'?ease(clamp(t*1.12,0,1)):ease(t);
    const poseAt=t=>{const f=((t%4)+4)%4,a=Math.floor(f),b=(a+1)%4,m=timing(f-a),p={phase:f};Object.keys(defaults).forEach(k=>p[k]=poses[a][k]*(1-m)+poses[b][k]*m);return p;};
    const anatomy=(p,w,h)=>{const s=profile(),cx=w*.5,ground=h*.84,phase=p.phase??selected,stepAngle=phase/4*Math.PI,direction=Math.cos(stepAngle),travel=Math.sin(stepAngle),stride=28+p.stride*Math.min(76,w*.12),hipY=ground-102-p.height*Math.min(style==='cartoon'?76:62,h*.14),hip={x:cx+Math.sin(stepAngle*2)*(style==='cartoon'?8:5),y:hipY},chest={x:hip.x-Math.sin(stepAngle*2)*6,y:hipY-s.torso},head={x:chest.x+Math.sin(stepAngle*2)*3,y:chest.y-(s.headSize+21)};
      const lifted=Math.sin(stepAngle)*p.lift*Math.min(68,h*.13),footA={x:cx+stride*direction,y:ground},footB={x:cx-stride*direction,y:ground-lifted};
      const kneeA={x:(hip.x+footA.x)/2+18*direction,y:(hip.y+footA.y)/2+6},kneeB={x:(hip.x+footB.x)/2-22*direction,y:(hip.y+footB.y)/2-10*travel};
      const handReach=25+p.arm*Math.min(58,w*.1),shoulderY=chest.y+18,handA={x:chest.x-handReach*direction,y:hip.y-10+travel*13},handB={x:chest.x+handReach*direction,y:hip.y+7-travel*13};
      const result={cx,ground,hip,chest,head,footA,footB,kneeA,kneeB,handA,handB,shoulderY,direction};if(style==='retro')for(const key of ['hip','chest','head','footA','footB','kneeA','kneeB','handA','handB']){result[key].x=Math.round(result[key].x/4)*4;result[key].y=Math.round(result[key].y/4)*4;}return result;};
    const grade=()=>{const t=targets(),checks=[
      poses[1].height<poses[0].height-(t[0].height-t[1].height)*.65,
      poses[3].height>poses[2].height+(t[3].height-t[2].height)*.65,
      poses[0].stride>poses[1].stride+(t[0].stride-t[1].stride)*.6,
      poses[2].stride<poses[3].stride-(t[3].stride-t[2].stride)*.6,
      poses[0].arm>t[0].arm*.78,
      poses[2].lift>t[2].lift*.78,
      poses[0].lift<Math.max(.2,t[0].lift+.14),
      poses[1].lift<Math.max(.2,t[1].lift+.14)
    ];return{checks,score:checks.filter(Boolean).length/checks.length*100};};
    const diagnostic=()=>{const {checks,score}=grade();if(!checks[0])return'<strong>Find the down:</strong> Lower the Down pose clearly below Contact so the landing has weight.';if(!checks[1])return'<strong>Show the push:</strong> Raise Up above Passing to create a visible vertical rhythm.';if(!checks[2])return'<strong>Open the contact:</strong> Contact needs a longer stride than Down; let the limbs reach before weight lands.';if(!checks[3])return'<strong>Close the passing pose:</strong> Bring the feet nearer together as the free leg travels under the hips.';if(!checks[4])return'<strong>Clarify opposition:</strong> Increase arm swing on Contact so the silhouette reads from a distance.';if(!checks[6]||!checks[7])return'<strong>Protect contact:</strong> Keep Foot lift low on Contact and Down so the planted foot does not skate.';if(!checks[5])return'<strong>Clear the floor:</strong> Raise Foot lift on Passing to keep the toe from dragging.';return score===100?`<strong>${profile().label.toLowerCase()} cycle reads:</strong> The core mechanics are clear and the exaggeration, cadence, and silhouette agree with this art direction.`:'<strong>Nearly there:</strong> Compare the silhouette and contact markers before adding more detail.';};
    const path=(ctx,points,color)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);};
    const drawFigure=(ctx,p,w,h,opts={})=>{const a=anatomy(p,w,h),s=profile(),alpha=opts.alpha??1,color=opts.color||s.ink,width=s.width;ctx.save();ctx.globalAlpha=alpha;ctx.lineCap=style==='retro'?'butt':'round';ctx.lineJoin=style==='retro'?'miter':'round';
      if(!opts.ghost){ctx.fillStyle='rgba(14,47,60,.08)';ctx.beginPath();ctx.ellipse(a.cx,a.ground+9,Math.min(106,w*.18),11,0,0,Math.PI*2);ctx.fill();}
      line(ctx,a.hip.x,a.hip.y,a.chest.x,a.chest.y,color,11*width);line(ctx,a.chest.x,a.shoulderY,a.handA.x,a.handA.y,opts.ghost?color:s.arm,8*width);line(ctx,a.chest.x,a.shoulderY,a.handB.x,a.handB.y,opts.ghost?color:s.arm,8*width);
      for(const [knee,foot] of [[a.kneeA,a.footA],[a.kneeB,a.footB]]){line(ctx,a.hip.x,a.hip.y,knee.x,knee.y,opts.ghost?color:s.limb,10*width);line(ctx,knee.x,knee.y,foot.x,foot.y,opts.ghost?color:s.limb,10*width);line(ctx,foot.x-10,foot.y,foot.x+18,foot.y,opts.ghost?color:s.limb,8*width);}
      ctx.fillStyle=opts.ghost?color:s.head;if(style==='retro')ctx.fillRect(a.head.x-s.headSize,a.head.y-s.headSize,s.headSize*2,s.headSize*2);else{ctx.beginPath();ctx.ellipse(a.head.x,a.head.y,s.headSize,style==='cartoon'?s.headSize*1.08:s.headSize,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle=opts.ghost?color:s.ink;ctx.beginPath();ctx.arc(a.head.x+s.headSize*.36,a.head.y-3,3,0,Math.PI*2);ctx.fill();
      if(!opts.ghost){ctx.fillStyle=s.accent;for(const foot of [a.footA,a.footB])if(Math.abs(foot.y-a.ground)<3){ctx.beginPath();ctx.ellipse(foot.x+4,a.ground+7,25,5,0,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='rgba(18,61,75,.35)';ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(a.head.x,a.head.y-s.headSize-7);ctx.lineTo(a.hip.x,a.ground);ctx.stroke();ctx.setLineDash([]);}
      ctx.restore();return a;};
    const syncReadout=()=>{const frames=profile().frames,frame=Math.min(frames,Math.floor(time/4*frames)+1),poseIndex=Math.floor((time+.5)%4);q(root,'[data-animation-readout]').textContent=`${profile().label} · FRAME ${String(frame).padStart(2,'0')} · ${names[poseIndex]}`;q(root,'[data-animation-pose-name]').textContent=names[selected];q(root,'[data-animation-time]').value=Math.round(time/4*100);q(root,'output[for="animTime"]').textContent=String(frame).padStart(2,'0');};
    const draw=()=>{if(!api)return;const {ctx}=api,w=api.surface.width,h=api.surface.height,p=poseAt(time),s=profile();ctx.clearRect(0,0,w,h);ctx.fillStyle=s.bg;ctx.fillRect(0,0,w,h);for(let x=0;x<w;x+=32)line(ctx,x,0,x,h,s.grid,1);for(let y=0;y<h;y+=32)line(ctx,0,y,w,y,s.grid,1);
      const anatomyNow=anatomy(p,w,h);if(arcs){const samples=Array.from({length:24},(_,i)=>anatomy(poseAt(i/6),w,h));path(ctx,samples.map(a=>a.head),`${s.ink}78`);path(ctx,samples.map(a=>a.handA),`${s.arm}78`);path(ctx,samples.map(a=>a.footB),`${s.accent}88`);}
      if(onion&&!playing){drawFigure(ctx,{...poseAt(selected+3),phase:selected+3},w,h,{ghost:true,alpha:.16,color:'#155a6e'});drawFigure(ctx,{...poseAt(selected+1),phase:selected+1},w,h,{ghost:true,alpha:.16,color:'#155a6e'});}
      line(ctx,Math.max(28,w*.1),anatomyNow.ground,Math.min(w-28,w*.9),anatomyNow.ground,s.ink,2);for(let x=Math.max(28,w*.1);x<Math.min(w-28,w*.9);x+=32)line(ctx,x,anatomyNow.ground,x,anatomyNow.ground+5,s.ink,1);
      drawFigure(ctx,p,w,h);ctx.fillStyle=s.ink;ctx.font='700 10px JetBrains Mono';ctx.fillText(playing?`${s.timing.toUpperCase()} PLAYBACK`:'POSE COMPARISON',18,24);ctx.globalAlpha=.58;ctx.fillText('CENTER OF MASS',Math.min(w-116,anatomyNow.hip.x+18),anatomyNow.hip.y-8);ctx.globalAlpha=1;
      const result=grade();updateMeter(root,result.score,diagnostic());syncReadout();};
    const setPlaying=value=>{playing=value;q(root,'[data-animation-play]').textContent=playing?'❚❚ Pause loop':'▶ Play loop';};
    const selectPose=index=>{selected=(index+4)%4;setPlaying(false);time=selected;qa(root,'[data-pose]').forEach((b,i)=>{const active=i===selected;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});const p=currentPose();qa(root,'[data-control]').forEach(input=>{input.value=Math.round(p[input.dataset.control]*100);q(root,`output[for="${input.id}"]`).textContent=input.value;});draw();};
    api=setupCanvas(root,draw);
    qa(root,'[data-pose]').forEach(button=>button.addEventListener('click',()=>selectPose(+button.dataset.pose)));
    qa(root,'[data-control]').forEach(input=>input.addEventListener('input',()=>{currentPose()[input.dataset.control]=+input.value/100;q(root,`output[for="${input.id}"]`).textContent=input.value;time=selected;draw();}));
    q(root,'[data-animation-time]').addEventListener('input',e=>{setPlaying(false);time=+e.target.value/100*4;if(time>=4)time=3.999;draw();});
    q(root,'[data-animation-speed]').addEventListener('input',e=>{speed=+e.target.value/100;q(root,`output[for="${e.target.id}"]`).textContent=`${speed}×`;});
    q(root,'[data-animation-play]').addEventListener('click',()=>{setPlaying(!playing);draw();});
    q(root,'[data-animation-guide]').addEventListener('click',()=>{poses=targets().map(p=>({...p}));selectPose(selected);});
    q(root,'[data-animation-reset]').addEventListener('click',()=>{poses=targets().map(()=>({...defaults}));selectPose(0);});
    qa(root,'[data-animation-style]').forEach(button=>button.addEventListener('click',()=>{style=button.dataset.animationStyle;root.dataset.motionStyle=style;poses=targets().map(p=>({...p}));qa(root,'[data-animation-style]').forEach(b=>{const active=b===button;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});q(root,'[data-animation-style-label]').textContent=profile().label;q(root,'[data-animation-style-brief]').textContent=profile().brief;selectPose(selected);}));
    for(const [selector,key] of [['[data-animation-onion]','onion'],['[data-animation-arcs]','arcs']])q(root,selector).addEventListener('click',e=>{if(key==='onion')onion=!onion;else arcs=!arcs;const active=key==='onion'?onion:arcs;e.currentTarget.classList.toggle('is-active',active);e.currentTarget.setAttribute('aria-pressed',String(active));draw();});
    api.canvas.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setPlaying(false);time=(time+(event.key==='ArrowLeft'?-.125:.125)+4)%4;draw();}else if(event.key===' '){event.preventDefault();setPlaying(!playing);draw();}else if(/^[1-4]$/.test(event.key)){event.preventDefault();selectPose(+event.key-1);}});
    SimKit.loop(dt=>{if(playing){time=(time+dt*1.6*speed)%4;draw();}});draw();
  }

  const initializers={texture:initTexture,furniture:initFurniture,room:initRoom,uv:initUv,animation:initAnimation};
  document.querySelectorAll('[data-asset-sim]').forEach(root=>initializers[root.dataset.assetSim]?.(root));
})();
