(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('simCanvas'), sim = SimKit.canvas2d(canvas);
  // Fixed logical arena keeps physics and trials identical at every viewport size.
  const W = 720, H = 540, light = {x:480,y:170};
  const robot = {x:180,y:350,a:0}, trail = [];
  const modes = [
    {cross:false,plus:true,text:'A · Same-side excitation: the brighter sensor speeds up its own wheel. The robot steers away from the light.'},
    {cross:true,plus:true,text:'B · Crossed excitation: the brighter sensor speeds up the opposite wheel. The robot steers toward the light and speeds up as it approaches.'},
    {cross:false,plus:false,text:'C · Same-side inhibition: the brighter sensor slows its own wheel. The robot steers toward the light and slows as it approaches.'},
    {cross:true,plus:false,text:'D · Crossed inhibition: the brighter sensor slows the opposite wheel. The robot steers away; it moves faster farther from the light.'}
  ];
  let mode = 0, running = false, elapsed = 0, clock = 0;
  function signals() {
    const sensors = [-1,1].map(side => ({x:robot.x+Math.cos(robot.a)*23-Math.sin(robot.a)*side*17,y:robot.y+Math.sin(robot.a)*23+Math.cos(robot.a)*side*17}));
    const values = sensors.map(s => Math.min(1,3600/(Math.hypot(s.x-light.x,s.y-light.y)**2+1600)));
    const m = modes[mode], input = m.cross ? [...values].reverse() : values;
    const motors = input.map(v => m.plus ? 160*v : 160*(1-v));
    return {sensors,values,motors};
  }
  function advance(dt) {
    const {motors:[l,r]} = signals();
    // Screen y increases downwards, so faster LEFT wheel increases angle.
    robot.a += (l-r)/40*dt;
    robot.x += Math.cos(robot.a)*(l+r)/2*dt;
    robot.y += Math.sin(robot.a)*(l+r)/2*dt;
    if(robot.x<0||robot.x>W||robot.y<0||robot.y>H){robot.x=(robot.x+W)%W;robot.y=(robot.y+H)%H;trail.length=0;}
    elapsed+=dt; trail.push({x:robot.x,y:robot.y});if(trail.length>2000)trail.shift();
  }
  function pause(){running=false;$('run').textContent='Run';}
  function reset(resetLight=false){pause();Object.assign(robot,{x:180,y:350,a:0});if(resetLight)Object.assign(light,{x:480,y:170});elapsed=0;trail.length=0;draw();}
  function select(i){mode=i;document.querySelectorAll('[data-wiring]').forEach(b=>{const active=Number(b.dataset.wiring)===i;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});$('wiring-desc').textContent=modes[i].text;$('wire-left').setAttribute('d',`M65 46 L${modes[i].cross?215:65} 114`);$('wire-right').setAttribute('d',`M215 46 L${modes[i].cross?65:215} 114`);$('sign').textContent=modes[i].plus?'+':'−';$('wiring-map').setAttribute('aria-label',modes[i].text);reset();}
  function draw(){
    const ctx=sim.ctx, {values,motors,sensors}=signals();
    ctx.save();ctx.scale(sim.width/W,sim.height/H);ctx.fillStyle='#0b1725';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#203247';ctx.lineWidth=1;for(let x=0;x<W;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.strokeStyle='#614b29';for(const radius of [60,120,180,240]){ctx.beginPath();ctx.arc(light.x,light.y,radius,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='#ffd36c';ctx.beginPath();ctx.arc(light.x,light.y,13,0,Math.PI*2);ctx.fill();ctx.font='15px sans-serif';ctx.fillText('LIGHT',Math.min(W-60,light.x+19),Math.max(18,light.y-15));
    ctx.strokeStyle='#8eb7cf';ctx.setLineDash([3,5]);ctx.beginPath();trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);
    sensors.forEach(s=>{ctx.strokeStyle='#ffffff30';ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(light.x,light.y);ctx.stroke();});
    ctx.save();ctx.translate(robot.x,robot.y);ctx.rotate(robot.a);ctx.fillStyle='#bacbdd';ctx.fillRect(-24,-19,48,38);ctx.fillStyle='#fff';ctx.fillRect(-13,-26,26,7);ctx.fillRect(-13,19,26,7);
    ctx.strokeStyle=modes[mode].plus?'#7ce4ba':'#ffab9b';ctx.lineWidth=3;[-1,1].forEach(side=>{ctx.beginPath();ctx.moveTo(23,side*17);ctx.lineTo(-8,(modes[mode].cross?-side:side)*22);ctx.stroke();ctx.fillStyle='#ffd36c';ctx.beginPath();ctx.arc(23,side*17,5,0,Math.PI*2);ctx.fill();});ctx.fillStyle='#0b1725';ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(3,-7);ctx.lineTo(3,7);ctx.fill();ctx.restore();ctx.restore();
    ['left','right'].forEach((side,i)=>{$('sensor-'+side).textContent=Math.round(values[i]*100)+'%';$('motor-'+side).textContent=motors[i].toFixed(1);});$('time').textContent=elapsed.toFixed(1)+' s';const diff=motors[0]-motors[1];$('steering').textContent=Math.abs(diff)<.15?'Equal motors → straight':diff>0?'Left motor faster → turn right':'Right motor faster → turn left';
  }
  $('run').addEventListener('click',()=>{running=!running;$('run').textContent=running?'Pause':'Run';});$('step').addEventListener('click',()=>{pause();for(let i=0;i<10;i++)advance(.01);draw();});$('reset').addEventListener('click',()=>reset(true));document.querySelectorAll('[data-wiring]').forEach(b=>b.addEventListener('click',()=>select(Number(b.dataset.wiring))));
  function place(e){const r=canvas.getBoundingClientRect();light.x=Math.max(15,Math.min(W-15,(e.clientX-r.left)/r.width*W));light.y=Math.max(15,Math.min(H-15,(e.clientY-r.top)/r.height*H));draw();}
  let dragging=false;canvas.addEventListener('pointerdown',e=>{dragging=true;canvas.setPointerCapture(e.pointerId);place(e);});canvas.addEventListener('pointermove',e=>{if(dragging)place(e);});['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,()=>dragging=false));
  canvas.addEventListener('keydown',e=>{const keys={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!keys[e.key])return;e.preventDefault();const [x,y]=keys[e.key],n=e.shiftKey?40:10;light.x=Math.max(15,Math.min(W-15,light.x+x*n));light.y=Math.max(15,Math.min(H-15,light.y+y*n));draw();});
  document.querySelectorAll('[data-predict]').forEach(b=>b.addEventListener('click',()=>{$('prediction-feedback').textContent=b.dataset.predict==='left'?'Correct: the brighter left sensor drives the right wheel faster, turning left. Choose B, reset, and step to check.':'Trace the crossed wire: the left sensor drives the right motor. A faster right wheel turns the robot left, toward the light. Reset and test B.';}));
  select(0);SimKit.loop(dt=>{if(running){let remaining=Math.min(dt,.05);while(remaining>0){const step=Math.min(.01,remaining);advance(step);remaining-=step;}}clock+=dt;if(clock>.08){draw();clock=0;}});
})();
