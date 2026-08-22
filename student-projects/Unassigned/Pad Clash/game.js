const canvas = document.querySelector("#gameCanvas"), ctx = canvas.getContext("2d"), $ = s => document.querySelector(s);
const moves = [
  {name:"Step Left",key:"A",color:"#28f3e8",power:5},{name:"Step Right",key:"S",color:"#19c6ff",power:5},
  {name:"Top Rock",key:"D",color:"#4584ff",power:7},{name:"Body Wave",key:"F",color:"#8d72ff",power:7},
  {name:"Spin Kick",key:"J",color:"#ff3a91",power:10},{name:"Floor Drop",key:"K",color:"#ff6257",power:11},
  {name:"Freeze",key:"L",color:"#ffd447",power:13},{name:"Power Move",key:";",color:"#fff",power:15}
];
const tracks = {
  neon:{name:"Neon Footwork",bpm:112,bars:12,bass:[45,45,48,43],pattern:[0,1,0,2,1,3,0,1,4,1,2,5,0,3,1,6]},
  breaks:{name:"Concrete Breaks",bpm:124,bars:14,bass:[38,38,41,36],pattern:[0,2,1,3,4,0,5,1,2,6,3,1,7,4,0,5]},
  boss:{name:"Final Cypher",bpm:136,bars:16,bass:[41,44,39,46],pattern:[0,1,4,2,5,3,6,1,0,7,2,4,1,5,3,6]}
};
let midiAccess, activeInput, audio, master, sequenceTimer, gameTimer, particles=[], dancers={p:0,c:0};
let mapping = JSON.parse(localStorage.getItem("padClashMapping")||"null") || Object.fromEntries(moves.map((_,i)=>[i,36+i]));
let learning=false,learnIndex=0;
let state={running:false,playerHP:100,cpuHP:100,hype:0,playerScore:0,cpuScore:0,combo:0,bpm:112,startAt:0,chart:[],track:null,beat:-1,lastAudioStep:-1};

function buildMoves(){
  $("#moveGrid").innerHTML=moves.map((m,i)=>`<div class="move" data-move="${i}"><b>${m.name}</b><small>MPD NOTE ${mapping[i]}</small><span class="key">${m.key}</span></div>`).join("");
  $("#mappingProgress").innerHTML=moves.map((m,i)=>`<div class="map-pad ${mapping[i]!=null?"done":""}">${m.name}<br>NOTE ${mapping[i]??"—"}</div>`).join("");
} buildMoves();

async function connectMIDI(){
  if(!navigator.requestMIDIAccess)return setStatus("WEB MIDI UNSUPPORTED",false);
  try{midiAccess=await navigator.requestMIDIAccess();const inputs=[...midiAccess.inputs.values()];activeInput=inputs.find(x=>/MPD226|Akai/i.test(x.name))||inputs[0];
    if(activeInput){activeInput.onmidimessage=onMIDI;setStatus(activeInput.name,true)}else setStatus("NO MIDI DEVICE FOUND",false);
    midiAccess.onstatechange=()=>connectMIDI();
  }catch{setStatus("MIDI PERMISSION NEEDED",false)}
}
function setStatus(text,on){$("#midiText").textContent=text.toUpperCase();$(".midi-status").classList.toggle("connected",on);$("#connectBtn").textContent=on?"READY":"CONNECT"}
function onMIDI(e){const [status,note,velocity]=e.data;if((status&240)!==144||!velocity)return;
  if(learning){if(Object.values(mapping).includes(note))return;mapping[learnIndex]=note;learnIndex++;localStorage.setItem("padClashMapping",JSON.stringify(mapping));buildMoves();
    if(learnIndex===8){learning=false;$("#mapInstruction").innerHTML="<b>Preset complete.</b> Your MPD226 is ready.";setTimeout(()=>$("#mapDialog").close(),650)}
    else $("#mapInstruction").innerHTML=`Strike the pad for <b>${moves[learnIndex].name}</b>.`;return}
  const i=Object.keys(mapping).find(k=>mapping[k]===note);if(i!=null)performMove(+i,velocity/127);
}
function beginLearning(){learning=true;learnIndex=0;mapping={};buildMoves();$("#mapInstruction").innerHTML=`Strike the pad for <b>${moves[0].name}</b>.`;$("#mapDialog").showModal();connectMIDI()}
function resetPreset(){mapping=Object.fromEntries(moves.map((_,i)=>[i,36+i]));localStorage.setItem("padClashMapping",JSON.stringify(mapping));buildMoves();$("#mapInstruction").innerHTML="<b>Factory preset restored:</b> MIDI notes 36–43.";learning=false}

function makeChart(track){
  const chart=[], unit=60000/track.bpm;
  for(let bar=0;bar<track.bars;bar++)for(let step=0;step<16;step++){
    const dense=track.bpm>130||bar>5, should=step%2===0||(dense&&step%4===3)||((bar+step)%11===0);
    if(should)chart.push({lane:track.pattern[(step+bar*3)%16],time:(bar*4+step/4)*unit,hit:false,miss:false});
  } return chart;
}
function initAudio(){
  audio ||= new (window.AudioContext||window.webkitAudioContext)();master ||= audio.createGain();master.gain.value=.2;master.connect(audio.destination);audio.resume();
}
function tone(freq,when,duration,type="sine",volume=.15){
  const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,when);g.gain.setValueAtTime(volume,when);g.gain.exponentialRampToValueAtTime(.001,when+duration);o.connect(g);g.connect(master);o.start(when);o.stop(when+duration);
}
function noise(when,volume=.12){
  const b=audio.createBuffer(1,audio.sampleRate*.08,audio.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const s=audio.createBufferSource(),g=audio.createGain();s.buffer=b;g.gain.setValueAtTime(volume,when);g.gain.exponentialRampToValueAtTime(.001,when+.08);s.connect(g);g.connect(master);s.start(when);
}
function musicTick(){
  if(!state.running)return;const unit=60000/state.bpm,step=Math.floor((performance.now()-state.startAt)/(unit/4));
  for(let s=state.lastAudioStep+1;s<=step+2;s++){if(s<0)continue;const when=audio.currentTime+Math.max(0,(state.startAt+s*unit/4-performance.now())/1000);
    if(s%4===0)tone(55,when,.16,"sine",.5);if(s%8===4)noise(when,.32);if(s%2===0)noise(when,.025);
    if(s%4===0){const midi=state.track.bass[Math.floor(s/4)%4];tone(440*2**((midi-69)/12),when,.32,"sawtooth",.12)}
    if(s%8===6)tone(880,when,.05,"square",.025);
  }state.lastAudioStep=step+2;
}
function startGame(){
  const track=tracks[$("#trackSelect").value];initAudio();Object.assign(state,{running:true,playerHP:100,cpuHP:100,hype:0,playerScore:0,cpuScore:0,combo:0,bpm:track.bpm,track,chart:makeChart(track),startAt:performance.now()+1800,beat:-1,lastAudioStep:-1});
  $("#startOverlay").classList.add("hidden");updateHUD();clearInterval(sequenceTimer);clearInterval(gameTimer);sequenceTimer=setInterval(musicTick,40);gameTimer=setInterval(updateGame,30);callout(track.name,"#fff");
}
function updateGame(){
  if(!state.running)return;const now=performance.now()-state.startAt,unit=60000/state.bpm,beat=Math.floor(now/unit);
  if(beat!==state.beat&&beat>=0){state.beat=beat;$("#beatPulse").classList.remove("hit");void $("#beatPulse").offsetWidth;$("#beatPulse").classList.add("hit")}
  state.chart.forEach(n=>{if(!n.hit&&!n.miss&&now-n.time>260){n.miss=true;state.combo=0;state.playerHP=Math.max(0,state.playerHP-3);state.cpuScore+=300}});
  const total=state.track.bars*4*unit;if(now>total+800||state.playerHP<=0)endRound(state.playerHP>0&&state.playerScore>=state.cpuScore);updateHUD();
}
function performMove(i,velocity=1){
  if(!state.running)return;const now=performance.now()-state.startAt,candidates=state.chart.filter(n=>!n.hit&&!n.miss&&n.lane===i).sort((a,b)=>Math.abs(a.time-now)-Math.abs(b.time-now)),note=candidates[0];
  flashMove(i);dancers.p=i+1;setTimeout(()=>dancers.p=0,220);
  if(!note||Math.abs(note.time-now)>280){state.combo=0;state.hype=Math.max(0,state.hype-4);callout("WRONG PAD","#77718b");return}
  const delta=Math.abs(note.time-now),grade=delta<65?"PERFECT!":delta<140?"GREAT!":"GOOD",mult=delta<65?1.7:delta<140?1.25:.8,finisher=state.hype>=100;
  note.hit=true;const damage=moves[i].power*mult*(.75+.25*velocity)*(finisher?2:1);state.cpuHP=Math.max(0,state.cpuHP-damage);state.playerScore+=Math.round(damage*100*(1+Math.min(20,state.combo)*.03));state.combo++;state.hype=finisher?0:Math.min(100,state.hype+(mult>1?10:5));
  burst(390,390,moves[i].color,12);callout(finisher?"HYPE FINISHER!":grade,moves[i].color);if(state.cpuHP<=0)endRound(true);updateHUD();
}
function endRound(win){if(!state.running)return;state.running=false;clearInterval(sequenceTimer);clearInterval(gameTimer);callout(win?"TRACK CLEARED!":"BEAT FAILED",win?"#28f3e8":"#ff3a91");setTimeout(()=>{$("#startOverlay").classList.remove("hidden");$("#startOverlay h1").innerHTML=win?"CYPHER <span>CLEARED.</span>":"RUN IT <span>BACK.</span>";$("#startBtn").childNodes[0].textContent="PLAY AGAIN ";},1100)}
function updateHUD(){
  $("#playerHealth").style.width=state.playerHP+"%";$("#cpuHealth").style.width=state.cpuHP+"%";$("#hypeBar").style.width=state.hype+"%";$("#hypeValue").textContent=Math.round(state.hype)+"%";$("#playerScore").textContent=String(state.playerScore).padStart(6,"0");$("#cpuScore").textContent=String(state.cpuScore).padStart(6,"0");
  if(state.running&&state.track){const duration=state.track.bars*4*(60000/state.bpm),elapsed=Math.max(0,performance.now()-state.startAt);$("#timer").textContent=Math.max(0,Math.ceil((duration-elapsed)/1000))}
}
function flashMove(i){const e=document.querySelector(`[data-move="${i}"]`);e.classList.add("active");setTimeout(()=>e.classList.remove("active"),130)}
function callout(text,color){const e=$("#callout");e.textContent=text;e.style.color=color;e.classList.remove("show");void e.offsetWidth;e.classList.add("show")}
function burst(x,y,color,count){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*16,vy:(Math.random()-.8)*15,life:1,color})}
function drawDancer(x,y,side,move){ctx.save();ctx.translate(x,y);if(side==="cpu")ctx.scale(-1,1);const bob=Math.sin(performance.now()/110)*4,kick=move===5?45:0,arm=move===3?35:10;ctx.strokeStyle=side==="player"?"#28f3e8":"#ff3a91";ctx.lineWidth=15;ctx.lineCap="round";ctx.shadowBlur=22;ctx.shadowColor=ctx.strokeStyle;ctx.beginPath();ctx.arc(0,-105+bob,25,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-78+bob);ctx.lineTo(0,-8+bob);ctx.moveTo(0,-58+bob);ctx.lineTo(55+arm,-35-(move?25:0));ctx.moveTo(0,-55+bob);ctx.lineTo(-42,-18+(move===4?45:0));ctx.moveTo(0,-8+bob);ctx.lineTo(42+kick,65);ctx.moveTo(0,-8+bob);ctx.lineTo(-32,65);ctx.stroke();ctx.fillStyle="#fff";ctx.font="800 13px Inter";ctx.textAlign="center";ctx.fillText(side==="player"?"YOU":"DJ VOID",0,95);ctx.restore()}
function render(){
  const w=canvas.width,h=canvas.height,t=performance.now();ctx.clearRect(0,0,w,h);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,"#171039");g.addColorStop(.56,"#0b0920");g.addColorStop(1,"#170d27");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#40346b";ctx.lineWidth=2;for(let i=0;i<13;i++){ctx.beginPath();ctx.moveTo(w/2,330);ctx.lineTo(i*w/12,h);ctx.stroke()}for(let i=0;i<7;i++){const y=340+i*i*8;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  ctx.fillStyle="#25164c";for(let i=0;i<20;i++){const bh=40+(i*37%170);ctx.fillRect(i*68,300-bh,48,bh)}drawDancer(390,420,"player",dancers.p);drawDancer(890,420,"cpu",dancers.c);
  if(state.running){const now=t-state.startAt,travel=1900,targetY=h*.86;state.chart.forEach(n=>{if(n.hit||n.miss)return;const y=targetY-(n.time-now)/travel*430;if(y<-30||y>h+40)return;const x=70+n.lane*((w-140)/8);ctx.shadowBlur=16;ctx.shadowColor=moves[n.lane].color;ctx.fillStyle=moves[n.lane].color;ctx.fillRect(x+5,y,118,20);ctx.fillStyle="#080719";ctx.font="900 13px Inter";ctx.textAlign="center";ctx.fillText("PAD "+(n.lane+1),x+64,y+15)});ctx.shadowBlur=0}
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.5;p.life-=.025;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,7,7)});ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);requestAnimationFrame(render);
}render();connectMIDI();
$("#connectBtn").onclick=connectMIDI;$("#startBtn").onclick=startGame;$("#learnBtn").onclick=beginLearning;$("#resetMapBtn").onclick=resetPreset;
document.addEventListener("keydown",e=>{if(e.code==="Space"&&!state.running){e.preventDefault();startGame();return}const i=moves.findIndex(m=>m.key.toLowerCase()===e.key.toLowerCase());if(i>=0)performMove(i,1)});
