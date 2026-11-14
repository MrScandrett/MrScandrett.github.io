import {motor,u16,validateProject} from './protocol.mjs';
import {Connection} from './connection.mjs';
import {drawRover} from './art.mjs';
import {setupAdvanced} from './studio.mjs';
import {drawWorld} from './world.mjs';
const $=id=>document.getElementById(id);
const names={forward:'Drive forward',backward:'Drive backward',left:'Spin left',right:'Spin right',motorA:'Motor A',tone:'Play tone',wait:'Wait',touch:'Wait for touch'};
const starters={hello:{version:1,repeat:1,steps:[{type:'forward',value:180},{type:'tone',value:440},{type:'backward',value:180}]},square:{version:1,repeat:4,steps:[{type:'forward',value:360},{type:'right',value:193}]},touch:{version:1,repeat:1,steps:[{type:'touch',value:10},{type:'forward',value:180},{type:'tone',value:660}]}};
let project=structuredClone(starters.hello),connection=null,running=false,connecting=false,stopping=false,generation=0,trail=[],pose={x:0,y:0,a:-Math.PI/2},motion=null;
let studio;
const encoders=[0,0,0];
try {const saved=localStorage.getItem('nxt-lab-v1');if(saved)project=validateProject(JSON.parse(saved));}catch{$('save-note').textContent='Could not restore a saved project. Use Save project to keep a file copy.';}
const logLines=[];
function log(bytes){logLines.push(Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(' '));$('log').textContent=logLines.slice(-18).join('\n');}
function status(s){$('status').textContent=s;}
function persist(){try{localStorage.setItem('nxt-lab-v1',JSON.stringify(project));}catch{$('save-note').textContent='Browser storage unavailable. Use Save project to keep a file copy.';}}
function code(){ $('code').textContent=`repeat ${project.repeat} times:\n`+project.steps.map((s,i)=>`  ${i+1}. ${names[s.type]} ${s.value}${['wait','touch'].includes(s.type)?' seconds':s.type==='tone'?' Hz (0.3 s)':' motor degrees'}`).join('\n'); }
function sync(){const busy=running||connecting||stopping;for(const el of document.querySelectorAll('#steps button,#steps input,#add,#repeat,#load-starter,#open,#starter,#new-type,#power,#reset'))el.disabled=busy;$('run').disabled=busy;$('connect-usb').disabled=busy||!!connection;$('connect-bt').disabled=busy||!!connection;$('disconnect').disabled=busy||!connection;for(const b of document.querySelectorAll('[data-edge=true]'))b.disabled=true;$('run').textContent=connection?'Run on real NXT':'Run in simulator';$('mode').textContent=connection?'REAL NXT':'SIMULATOR';studio?.sync(busy);}
function render(){
  $('steps').replaceChildren();
  project.steps.forEach((s,i)=>{
    const li=document.createElement('li'),row=document.createElement('div');li.dataset.type=s.type;row.className='step-row';
    const title=document.createElement('span');title.className='step-name';const icon=document.createElement('span');icon.className='step-icon';icon.setAttribute('aria-hidden','true');icon.textContent=({forward:'↑',backward:'↓',left:'↶',right:'↷',motorA:'⚙',tone:'♫',wait:'◷',touch:'◇'})[s.type];title.append(icon,document.createTextNode(names[s.type]));row.append(title);
    const label=document.createElement('label'),input=document.createElement('input');input.type='number';input.min=s.type==='tone'?200:1;input.max=['wait','touch'].includes(s.type)?10:s.type==='tone'?2000:720;input.value=s.value;input.setAttribute('aria-label',`${names[s.type]} value, step ${i+1}`);
    input.addEventListener('change',()=>{const n=Number(input.value);if(!Number.isInteger(n)||n<Number(input.min)||n>Number(input.max)){input.value=s.value;status(`Use a whole number from ${input.min} to ${input.max}.`);return;}s.value=n;persist();code();});
    label.append(input,document.createTextNode(['wait','touch'].includes(s.type)?'s':s.type==='tone'?'Hz':'°'));row.append(label);
    for(const [text,desc,fn,disabled] of [ ['↑','Move up',()=>{[project.steps[i-1],project.steps[i]]=[s,project.steps[i-1]];},i===0],['↓','Move down',()=>{[project.steps[i+1],project.steps[i]]=[s,project.steps[i+1]];},i===project.steps.length-1],['×','Remove',()=>project.steps.splice(i,1),project.steps.length===1] ]){
      const b=document.createElement('button');b.textContent=text;b.type='button';b.setAttribute('aria-label',`${desc} step ${i+1}`);b.dataset.edge=String(disabled);b.addEventListener('click',()=>{fn();render();persist();const rows=$('steps').children,j=Math.min(rows.length-1,Math.max(0,desc==='Move up'?i-1:desc==='Move down'?i+1:i));const again=rows[j]?.querySelector(`button[aria-label^="${desc}"]:not(:disabled)`)||rows[j]?.querySelector('button:not(:disabled)');again?.focus();});row.append(b);
    }
    li.append(row);$('steps').append(li);
  });
  $('repeat').value=project.repeat;code();sync();for(const b of document.querySelectorAll('[data-edge=true]'))b.disabled=true;
}
$('add').onclick=()=>{if(project.steps.length>=40){status('Maximum 40 steps.');return;}const type=$('new-type').value;project.steps.push({type,value:type==='tone'?440:type==='touch'?10:type==='wait'?1:180});persist();render();};
$('repeat').onchange=()=>{const n=Number($('repeat').value);if(Number.isInteger(n)&&n>=1&&n<=8){project.repeat=n;persist();code();}else{$('repeat').value=project.repeat;status('Repeat must be a whole number from 1 to 8.');}};
$('load-starter').onclick=()=>{project=structuredClone(starters[$('starter').value]);persist();render();};
$('power').oninput=()=>{$('power-out').value=$('power').value+'%';};
$('save').onclick=()=>{if(studio?.isBlocks()){try{studio.save();}catch(e){status(e.message);}return;}const url=URL.createObjectURL(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='my-nxt-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('open').onchange=async()=>{const f=$('open').files[0];if(!f)return;try{if(f.size>150000)throw Error('Project is too large (maximum 150 KB).');const loaded=JSON.parse(await f.text());if(loaded?.version===2){studio.importProgram(loaded);status('Blocks project opened.');return;}project=validateProject(loaded);studio?.useSequence();persist();render();status('Project opened.');}catch(e){status(`Could not open project: ${e.message}`);}finally{$('open').value='';}};
function activity(type=null){const active=type==='motorA'?['A']:['forward','backward','left','right'].includes(type)?['B','C']:type==='touch'?['1']:[];document.querySelectorAll('[data-port]').forEach(el=>el.classList.toggle('port-active',active.includes(el.dataset.port)));$('device-activity').textContent=type?`${names[type]} · ${active.length?'port '+active.join(' + '):type==='tone'?'brick speaker':'timer'}`:'Ready · no active outputs';}
function reset(){pose={x:0,y:0,a:-Math.PI/2};trail=[{...pose}];motion=null;}
$('reset').onclick=reset;
const sim=SimKit.canvas2d($('arena'));
function advance(dt){if(motion){const step=Math.min(dt,motion.remaining),dl=motion.left*step,dr=motion.right*step;pose.a+=(dl-dr)/120;const d=(dl+dr)/2;pose.x+=Math.cos(pose.a)*d;pose.y+=Math.sin(pose.a)*d;motion.remaining-=step;if(trail.length<12000)trail.push({...pose});if(motion.remaining<=0)motion=null;}}
SimKit.loop((dt,time)=>{
  advance(dt);
  const c=sim.ctx,w=sim.width,h=sim.height;
  const desk=c.createLinearGradient(0,0,0,h);desk.addColorStop(0,'#d3d5c9');desk.addColorStop(1,'#babfb5');c.fillStyle=desk;c.fillRect(0,0,w,h);
  c.save();c.translate(w/2,h/2);const extent=Math.max(300,...trail.map(p=>Math.max(Math.abs(p.x),Math.abs(p.y))+110));const scale=Math.min(w,h)/(extent*2);c.scale(scale,scale);
  c.strokeStyle='#63756c';c.globalAlpha=.25;c.lineWidth=1/scale;for(let n=-Math.ceil(extent/100)*100;n<=extent;n+=100){c.beginPath();c.moveTo(n,-extent);c.lineTo(n,extent);c.stroke();c.beginPath();c.moveTo(-extent,n);c.lineTo(extent,n);c.stroke();}c.globalAlpha=1;
  if(studio?.worldEnabled())drawWorld(c);
  c.strokeStyle='#61736b';c.lineWidth=1/scale;c.beginPath();c.arc(0,0,18,0,Math.PI*2);c.moveTo(-28,0);c.lineTo(28,0);c.moveTo(0,-28);c.lineTo(0,28);c.stroke();
  c.strokeStyle='#a6511f';c.lineWidth=2.5/scale;c.setLineDash([5/scale,4/scale]);c.beginPath();trail.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.setLineDash([]);
  c.translate(pose.x,pose.y);c.rotate(pose.a);drawRover(c,{moving:!!motion,time});c.restore();
  c.fillStyle='#43574c';c.font='10px monospace';c.fillText('N ↑',14,22);c.fillText('NXT • DIFFERENTIAL DRIVE',14,h-14);
  $('pose').textContent=`${connection?'Estimated':'Simulated'} position: ${Math.round(pose.x)} mm, ${Math.round(-pose.y)} mm · heading ${Math.round((pose.a*180/Math.PI+450)%360)}° · grid 100 mm`;
},{maxDt:.05});
async function pause(ms,token){const end=performance.now()+ms;while(performance.now()<end){if(token!==generation)throw Error('Stopped.');await new Promise(r=>setTimeout(r,Math.min(40,Math.max(0,end-performance.now()))));}if(token!==generation)throw Error('Stopped.');}
async function stop(message='Stopped.'){generation++;motion=null;activity();studio?.clearHighlight();const wasRunning=running;running=false;stopping=true;sync();try{if(connection)await connection.stop();}catch(e){status(`Stop could not be confirmed: ${e.message} Turn the brick off if needed.`);}finally{stopping=false;$('progress').textContent=message;document.querySelectorAll('#steps li').forEach(li=>li.classList.remove('active'));sync();}return wasRunning;}
$('stop').onclick=()=>stop();
window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();stop();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(running||connection))stop('Stopped because the tab was hidden.');});
window.addEventListener('blur',()=>{if(running&&connection)stop('Stopped because the window lost focus.');});
window.addEventListener('pagehide',()=>{if(connection)stop('Page closed.');});
async function connect(kind){connecting=true;sync();let candidate;
  try{candidate=new Connection(log,async e=>{generation++;running=false;motion=null;activity();status(`Connection lost: ${e.message} Check the brick; turn it off if necessary.`);connection=null;$('ready').checked=false;sync();await candidate.close();});const volts=await candidate.connect(kind);await candidate.stop();connection=candidate;$('ready').checked=false;status(`NXT connected via ${kind==='usb'?'USB':'Bluetooth serial'} · battery ${volts} V. First test: tone, then wheels lifted.`);}
  catch(e){await candidate?.close();status(`Could not connect: ${e.message} See Connection help below.`);}finally{connecting=false;sync();}}
$('connect-usb').onclick=()=>connect('usb');$('connect-bt').onclick=()=>connect('serial');
$('disconnect').onclick=async()=>{await stop();const old=connection;connection=null;await old?.close();$('ready').checked=false;status('Disconnected. Simulator ready.');sync();};
async function execute(s,token){
  activity(s.type);
  const guard=()=>token===generation;const cmd=bytes=>connection.command(bytes,guard);
  if(s.type==='wait'){await pause(s.value*1000,token);return;}
  if(s.type==='tone'){if(connection)await cmd([0,3,...u16(s.value),...u16(300)]);else studio?.playTone(s.value,300);$('progress').textContent=`Tone: ${s.value} Hz${connection?' on the brick':' · simulated on this computer’s speaker'}`;await pause(350,token);return;}
  if(s.type==='touch'){
    if(connection){await cmd([0,5,0,1,32]);await pause(100,token);}
    const end=performance.now()+s.value*1000;let pressed=false;
    do{if(connection){const r=await cmd([0,7,0]);if(r.length<16||!r[4])throw Error('Touch input 1 is not ready. Check the sensor cable.');pressed=new DataView(r.buffer,r.byteOffset,r.byteLength).getInt16(12,true)!==0;}else pressed=$('sim-touch').checked;if(pressed)return;await pause(100,token);}while(performance.now()<end);
    throw Error('Touch input timed out. Press the port 1 sensor (or simulated touch) and try again.');
  }
  const power=Number($('power').value), sign=s.type==='backward'?-1:1;
  const ports=s.type==='motorA'?[[0,power]]:[[1,(s.type==='left'?-1:sign)*power],[2,(s.type==='right'?-1:sign)*power]];
  const duration=s.value/(power*8); // Ideal speed model; physical encoders govern real completion.
  if(s.type!=='motorA')motion={remaining:duration,left:ports[0][1]/power*s.value*Math.PI*56/360/duration,right:ports[1][1]/power*s.value*Math.PI*56/360/duration};
  if(connection){
    for(const [port,p] of ports)await cmd(motor(port,p,s.value));
    const deadline=performance.now()+10000;
    while(true){await pause(100,token);let done=true;for(const [port] of ports){const r=await cmd([0,6,port]);if(r.length!==25)throw Error('Invalid motor status reply.');if(r[8]!==0)done=false;}if(done)break;if(performance.now()>deadline)throw Error('Motor did not finish. Check for a jam; turn the brick off if needed.');}
    for(const [port] of ports)await cmd(motor(port,0));motion=null;
  }else {await pause(duration*1000,token);if(motion)advance(motion.remaining);}
}
$('run').onclick=async()=>{
  studio?.unlockAudio();
  if(studio?.isBlocks()){try{await runAdvanced(studio.current());}catch(e){status('Cannot run: '+e.message);}return;}
  if(running||stopping||connecting)return;
  if(connection&&!$('ready').checked){status('Complete the real-robot readiness check before running.');$('ready').focus();return;}
  running=true;const token=++generation;sync();
  try{
    validateProject(project);
    for(let rep=0;rep<project.repeat;rep++)for(let i=0;i<project.steps.length;i++){
      if(token!==generation)throw Error('Stopped.');document.querySelectorAll('#steps li').forEach((li,j)=>li.classList.toggle('active',i===j));$('progress').textContent=`Repeat ${rep+1}/${project.repeat} · step ${i+1}: ${names[project.steps[i].type]}`;await execute(project.steps[i],token);
    }
    if(token===generation)await stop('Program complete. Compare the result with your prediction.');
  }catch(e){if(token===generation)await stop(`Program stopped: ${e.message}`);}
};
reset();render();

// Help leaves the studio shell so the lesson below is reachable in either fullscreen mode.
for(const link of document.querySelectorAll('.nxt-app a[href^="#"]'))link.addEventListener('click',async e=>{
  const target=document.querySelector(link.getAttribute('href'));if(!target)return;e.preventDefault();
  if(running)await stop('Stopped to open the lesson guide.');
  const app=document.querySelector('[data-creation-app]');
  if(document.fullscreenElement===app)await document.exitFullscreen();
  else if(app.classList.contains('creation-app-expanded'))app.querySelector('.creation-app-fullscreen').click();
  target.scrollIntoView({behavior:'instant',block:'start'});
});

async function runAdvanced(program){
 studio?.unlockAudio();
 if(running||stopping||connecting)return;
 if(connection&&!$('ready').checked){status('Complete the real-robot readiness check before running.');$('ready').focus();return;}
 running=true;const token=++generation;sync();
 try{await studio.execute(program,token);if(token===generation)await stop('Program complete. Compare the result with your prediction.');}
 catch(e){if(token===generation)await stop('Program stopped: '+e.message);}
}
async function advancedMove(ports,degrees,token){
 const active=ports.filter(([,power])=>power!==0);const speed=Math.max(1,...ports.map(([,power])=>Math.abs(power)));const duration=active.length?degrees/(speed*8):0;
 const left=ports.find(([port])=>port===1)?.[1]||0,right=ports.find(([port])=>port===2)?.[1]||0;
 if(left||right)motion={remaining:duration,left:left/speed*degrees*Math.PI*56/360/duration,right:right/speed*degrees*Math.PI*56/360/duration};
 activity(ports.length===1&&ports[0][0]===0?'motorA':'forward');
 try{
  if(connection)await studio.brick(token).move(ports,degrees,ms=>pause(ms,token));
  else{await pause(duration*1000,token);if(motion)advance(motion.remaining);for(const [port,power]of active)encoders[port]+=Math.sign(power)*Math.max(1,Math.round(degrees*Math.abs(power)/speed));}
 }finally{motion=null;}
}
studio=setupAdvanced({
 getConnection:()=>connection,getToken:()=>generation,getSequence:()=>project,getPower:()=>Number($('power').value),
 status,log,stop,run:runAdvanced,move:advancedMove,pause,encoders,getPose:()=>pose,
 check:token=>{if(token!==generation)throw Error('Stopped.');},getBusy:()=>running||stopping||connecting,
 setProgress:text=>$('progress').textContent=text,
});
sync();
