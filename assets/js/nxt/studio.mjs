import {createBlocks} from './blocks.mjs';
import {checkProgram,DEFAULT_SENSORS,sensorNames,fromSequence,runProgram,csv,num} from './program.mjs';
import {Brick,pcmRso} from './brick.mjs';
import {toNxc} from './nxc.mjs';
import {projects,starterProgram} from './projects.mjs';
import {worldReading} from './world.mjs';
import {probeCompiler,COMPILER_ORIGIN} from './compiler-client.mjs';
const $=id=>document.getElementById(id);
export function setupAdvanced(h){
 let blocks=null,mode='sequence',config={...DEFAULT_SENSORS},rows=[],started=performance.now(),operation=false,busy=false,preparedSound=null,audio=null,recording=false,relay=null;const playing=new Set();
 let cachedBrick=null,cachedConnection=null;
 const saveFile=(name,data,type='application/octet-stream')=>{const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function note(text){$('block-status').textContent=text;}
 function sensorConfig(){const out={};for(const key of Object.keys(DEFAULT_SENSORS))out[key]=Number($('port-'+key).value);return out;}
 function applyConfig(sensors){config={...DEFAULT_SENSORS,...sensors};for(const [key,port]of Object.entries(config))if($('port-'+key))$('port-'+key).value=port;}
 for(const key of Object.keys(DEFAULT_SENSORS)){const label=document.createElement('label');label.textContent=sensorNames[key];const select=document.createElement('select');select.id='port-'+key;select.setAttribute('aria-label',sensorNames[key]+' input port');for(let n=0;n<=4;n++)select.add(new Option(n?'Input '+n:'Absent',String(n)));select.value=config[key];select.onchange=()=>{config=sensorConfig();changed();};label.append(select);$('sensor-ports').append(label);}
 for(const [key,p]of Object.entries(projects))$('project-starter').add(new Option(p.category+' · '+p.name,key));
 function ensureBlocks(){if(!blocks){blocks=createBlocks($('nxt-blocks'),changed);blocks.load(fromSequence(h.getSequence(),h.getPower(),sensorConfig()));}return blocks;}
 function current(){if(operation)throw Error('Wait for the current device or audio operation to finish.');return checkProgram(ensureBlocks().program(sensorConfig()));}
 function changed(){if(mode!=='blocks')return;try{const p=current();$('program-tree').value=JSON.stringify(p,null,2);$('code').textContent=toNxc(p);note('Ready · every block is connected. Motor power is limited to ±60; each move to 720°.');try{localStorage.setItem('nxt-blocks-v2',JSON.stringify(p));}catch{note('Ready · browser storage unavailable. Save a project file.');}}catch(e){note(e.message);}}
 function switchMode(next){if(h.getBusy()||operation)return;mode=next;$('sequence-controls').hidden=next!=='sequence';$('blocks-controls').hidden=next!=='blocks';document.querySelector('.nxt-app').classList.toggle('nxt-block-mode',next==='blocks');$('mode-sequence').setAttribute('aria-pressed',String(next==='sequence'));$('mode-blocks').setAttribute('aria-pressed',String(next==='blocks'));if(next==='blocks'){ensureBlocks();changed();requestAnimationFrame(()=>blocks.resize());}else{$('code').textContent='Sequence mode · choose Blocks to view the generated program.';}}
 $('mode-sequence').onclick=()=>switchMode('sequence');$('mode-blocks').onclick=()=>switchMode('blocks');
 $('load-project').onclick=()=>{try{const key=$('project-starter').value,p=starterProgram(key,sensorConfig());applyConfig(p.sensors);ensureBlocks().load(p);$('project-brief').textContent=projects[key].needs+' · '+projects[key].description;changed();}catch(e){note(e.message);}};
 $('convert-sequence').onclick=()=>{try{ensureBlocks().load(fromSequence(h.getSequence(),h.getPower(),sensorConfig()));changed();}catch(e){note(e.message);}};
 $('apply-tree').onclick=()=>{try{const p=checkProgram(JSON.parse($('program-tree').value));applyConfig(p.sensors);ensureBlocks().load(p);changed();}catch(e){note('Could not apply program: '+e.message);}};
 function showCompiler(result){$('compiler-state').textContent=result.message;$('compiler-state').dataset.state=result.state;if(result.state!=='ready')$('compiler-setup').open=true;h.status(result.message);}
 $('check-compiler').onclick=()=>deviceOperation(async()=>{h.status('Checking the local compiler and compiling a tone test…');showCompiler(await probeCompiler());});
 $('compile-program').onclick=()=>deviceOperation(async()=>{
  const p=mode==='blocks'?checkProgram(ensureBlocks().program(sensorConfig())):fromSequence(h.getSequence(),h.getPower(),sensorConfig());
  h.status('Checking the local compiler…');const result=await probeCompiler();showCompiler(result);if(result.state!=='ready')return;
  h.status('Compiling your program with the local companion…');let response;
  try{response=await fetch(COMPILER_ORIGIN+'/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),signal:AbortSignal.timeout(20000)});}catch{showCompiler({state:'unreachable',message:'The companion stopped responding. Reopen its window and press Check compiler; your program is still in the editor.'});return;}
  if(!response.ok){showCompiler({state:'compile-failed',message:'Program did not compile: '+(await response.text()).slice(0,4000)});return;}
  const output=await response.arrayBuffer();if(new TextDecoder().decode(new Uint8Array(output,0,Math.min(13,output.byteLength)))!=='MindstormsNXT'){showCompiler({state:'compile-failed',message:'The companion did not return a valid NXT executable. No file was downloaded.'});return;}
  saveFile('myrobot.rxe',output);h.status('myrobot.rxe compiled. Select it under Brick files and send it to the NXT; compiling does not start motors.');
 });
 $('export-nxc').onclick=()=>{try{const p=mode==='blocks'?current():fromSequence(h.getSequence(),h.getPower(),sensorConfig());saveFile('myrobot.nxc',toNxc(p),'text/plain');h.status('NXC source exported. Compile it with free NBC/NXC, then send the .rxe using Brick files.');}catch(e){h.status('Cannot export: '+e.message);}};
 function brick(token){const c=h.getConnection();if(!c)throw Error('Connect an NXT first.');if(c!==cachedConnection){cachedConnection=c;cachedBrick=new Brick(c);}cachedBrick.guard=()=>{try{h.check(token);return true;}catch{return false;}};return cachedBrick;}
 function reading(name,value){const id='reading-'+name;let dd=$(id);if(!dd){const dt=document.createElement('dt');dt.textContent=sensorNames[name];dd=document.createElement('dd');dd.id=id;$('sensor-readings').append(dt,dd);}dd.textContent=String(value);return value;}
 async function read(name,sensors,token){h.check(token);let value;
  if(h.getConnection())value=await brick(token).read(name,sensors);
  else if(name.startsWith('encoder'))value=h.encoders['ABC'.indexOf(name.at(-1))]+(name==='encoderA'?Number($('sim-encoder').value):0);
  else{if(!sensors[name])throw Error(name+' sensor is absent. Configure its input port.');
   if(name==='touch')value=+$('sim-touch').checked;
   else if(name==='touch2')value=+$('sim-touch2').checked;
   else if(name==='sound')value=Number($('sim-sound').value);
   else if($('manual-sensors').checked)value=Number($(name==='light'?'sim-light':'sim-distance').value);
   else value=worldReading(name,h.getPose());
  }if(!Number.isFinite(value))throw Error('Invalid sensor value.');return reading(name,value);
 }
 function sample(label,value){if(rows.length>=1000)throw Error('Notebook is full (1,000 samples). Download CSV, then clear it.');rows.push({time:Math.round(performance.now()-started),source:h.getConnection()?'NXT':'SIMULATED',label,value});$('measurement-count').textContent=rows.length+' samples · '+(h.getConnection()?'NXT readings':'simulated readings');$('measurements').textContent=rows.slice(-8).map(r=>`${r.time} ms | ${r.source} | ${r.label}: ${r.value}`).join('\n');}
 $('download-csv').onclick=()=>saveFile('nxt-measurements.csv',csv(rows),'text/csv');$('clear-samples').onclick=()=>{rows=[];started=performance.now();$('measurement-count').textContent='0 samples · notebook cleared';$('measurements').textContent='No measurements yet.';};
 async function deviceOperation(fn){if(h.getBusy()||operation)return;operation=true;sync(false);try{await fn(h.getToken());}catch(e){h.status(e.message);}finally{operation=false;sync(h.getBusy());}}
 $('read-sensors').onclick=()=>deviceOperation(async token=>{const sensors=sensorConfig();checkProgram({version:2,sensors,steps:[{type:'stop'}]});for(const name of Object.keys(sensors))if(sensors[name])sample(name,await read(name,sensors,token));h.status('Sensor snapshot added to the notebook.');});
 for(const button of document.querySelectorAll('[data-jog]')){const jog=()=>{if(h.getBusy()||operation)return;const type=button.dataset.jog;h.run(fromSequence({repeat:1,steps:[{type,value:45}]},25,sensorConfig()));};button.onclick=jog;button.onkeydown=e=>{if(e.repeat)return;const key={w:'forward',a:'left',s:'backward',d:'right'}[e.key.toLowerCase()];if(key){e.preventDefault();document.querySelector('[data-jog='+key+']').click();}};}

 $('connect-phone').onclick=()=>{try{const url=new URL($('phone-link').value);if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='8792'||url.protocol!=='http:'||!/^[a-f0-9]{20,64}$/.test(url.searchParams.get('token')||''))throw Error('Paste the teacher localhost relay link printed by nxt-phone-remote.mjs.');relay?.close();url.pathname='/events';relay=new EventSource(url);$('disconnect-phone').disabled=false;relay.onopen=()=>{$('phone-status').textContent='Phone relay connected. Keep this desktop tab active; STOP always takes priority.';};relay.onerror=()=>{$('phone-status').textContent='Relay unavailable or reconnecting. Check the teacher companion and local-network permission.';};relay.onmessage=e=>{try{const {action}=JSON.parse(e.data);if(action==='stop'){h.stop('Stopped from phone remote.');return;}if(document.hidden||!document.hasFocus()||h.getBusy()||operation){$('phone-status').textContent='Move ignored: keep the teacher tab active and wait for the current move.';return;}if(!['forward','backward','left','right'].includes(action))return;h.run(fromSequence({repeat:1,steps:[{type:action,value:45}]},25,sensorConfig()));}catch(err){$('phone-status').textContent=err.message;}};}catch(e){$('phone-status').textContent=e.message;}};
 $('disconnect-phone').onclick=()=>{relay?.close();relay=null;$('disconnect-phone').disabled=true;$('phone-status').textContent='Phone relay disconnected.';};
 window.addEventListener('pagehide',()=>relay?.close());
 function unlockAudio(){try{audio??=new AudioContext();audio.resume().catch(()=>{});}catch{}}
 function playTone(hz,ms){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),gain=audio.createGain();o.frequency.value=hz;gain.gain.setValueAtTime(.08,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+ms/1000);o.connect(gain).connect(audio.destination);playing.add(o);o.onended=()=>playing.delete(o);o.start();o.stop(audio.currentTime+ms/1000);}
 async function prepareAudio(buffer){const context=new AudioContext();try{const decoded=await context.decodeAudioData(buffer);preparedSound=pcmRso(Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i)),decoded.sampleRate);$('save-rso').disabled=false;$('audio-status').textContent=`hello.rso ready · ${((preparedSound.length-8)/8000).toFixed(1)} seconds. Save it, then send it under Brick files and use a Play sound file block.`;}finally{await context.close();}}
 $('audio-input').onchange=()=>deviceOperation(async()=>{const f=$('audio-input').files[0];if(!f)return;if(f.size>10*1024*1024)throw Error('Choose an audio file under 10 MB.');try{await prepareAudio(await f.arrayBuffer());}catch(e){$('audio-status').textContent='Could not decode audio: '+e.message;}});
 $('save-rso').onclick=()=>{if(preparedSound)saveFile('hello.rso',preparedSound);};
 $('record-audio').onclick=()=>deviceOperation(async()=>{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Microphone recording is unavailable. Choose an audio file instead.');let stream;recording=true;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});$('audio-status').textContent='Recording for 4 seconds…';const recorder=new MediaRecorder(stream),chunks=[];const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=resolve;recorder.onerror=reject;});recorder.start();await new Promise(r=>setTimeout(r,4000));recorder.stop();await done;await prepareAudio(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer());}catch(e){$('audio-status').textContent='Recording unavailable: '+e.message;}finally{stream?.getTracks().forEach(t=>t.stop());recording=false;}});
 $('upload-file').onclick=()=>deviceOperation(async token=>{if(!h.getConnection())throw Error('Connect an NXT first.');const file=$('brick-file').files[0];if(!file)throw Error('Choose a .rso or compiled .rxe file.');if(file.size>128000)throw Error('File exceeds the 128 KB classroom limit.');await brick(token).upload(file.name,await file.arrayBuffer(),(done,total)=>{$('file-status').textContent=`Sending ${file.name}: ${Math.round(done/total*100)}%`;});$('file-status').textContent=`${file.name} sent and closed. It has not been started.`;if(/\.rxe$/i.test(file.name))$('brick-program').value=file.name;});
 $('start-brick-program').onclick=()=>deviceOperation(async token=>{if(!$('ready').checked)throw Error('Complete the real-robot readiness check first.');await brick(token).start($('brick-program').value);$('file-status').textContent='Stored program started. STOP also sends StopProgram. Disconnect stops it; for unplugged operation, disconnect first and start from the brick menu.';});
 function sync(hostBusy){busy=hostBusy||operation;for(const el of document.querySelectorAll('#mode-sequence,#mode-blocks,#project-starter,#load-project,#convert-sequence,#apply-tree,#sensor-ports select,#read-sensors,[data-jog],#upload-file,#brick-file,#start-brick-program,#brick-program,#export-nxc,#compile-program,#check-compiler,#connect-phone,#phone-link,#audio-input,#record-audio'))el.disabled=busy;
  if(operation){$('run').disabled=true;$('connect-usb').disabled=true;$('connect-bt').disabled=true;$('disconnect').disabled=true;}
  else if(!hostBusy){$('run').disabled=false;$('connect-usb').disabled=!!h.getConnection();$('connect-bt').disabled=!!h.getConnection();$('disconnect').disabled=!h.getConnection();}
  blocks?.busy(busy);
 }
 async function execute(program,token){if(operation)throw Error('Device is busy.');started=performance.now();const p=checkProgram(program);await runProgram(p,{
  check:()=>h.check(token),read:(name,sensors)=>read(name,sensors,token),wait:ms=>h.pause(ms,token),move:(ports,degrees)=>h.move(ports,degrees,token),
  tone:async(hz,ms)=>{if(h.getConnection())await brick(token).tone(hz,ms);else playTone(hz,ms);h.setProgress(`Tone ${hz} Hz · ${ms} ms`);await h.pause(ms,token);},
  sound:async(file,ms)=>{if(h.getConnection())await brick(token).sound(file);else h.setProgress(`Simulated sound: ${file} (audio file is on the brick)`);await h.pause(ms,token);},
  sample,variables:values=>$('variables').textContent=JSON.stringify(values,null,2),resetEncoder:async port=>{if(h.getConnection())await brick(token).resetEncoder(port);else{h.encoders[port]=0;if(port===0)$('sim-encoder').value=0;}},
  brake:async coast=>{if(h.getConnection()){const b=brick(token);for(let port=0;port<3;port++)await b.command([0,4,port,0,coast?0:3,0,0,0,0,0,0,0]);}},
  highlight:id=>{if(mode==='blocks')blocks.highlight(id);h.setProgress('Running blocks · sensor decisions, loops and math');},
 });}
 function importProgram(p){const valid=checkProgram(p);switchMode('blocks');applyConfig(valid.sensors);ensureBlocks().load(valid);changed();}
 try{const saved=localStorage.getItem('nxt-blocks-v2');if(saved){const p=checkProgram(JSON.parse(saved));applyConfig(p.sensors);/* Restore lazily so Sequence remains an easy entry point. */$('mode-blocks').onclick=()=>{switchMode('blocks');if(!blocks._restored){blocks.load(p);blocks._restored=true;changed();}};}}catch{note('A previous blocks project could not be restored. Open a saved project file.');}
 return {sync,current,isBlocks:()=>mode==='blocks',useSequence:()=>switchMode('sequence'),worldEnabled:()=>mode==='blocks',execute,brick,importProgram,unlockAudio,playTone,clearHighlight:()=>{blocks?.highlight(null);for(const o of playing){try{o.stop();}catch{}}playing.clear();},save:()=>saveFile('my-nxt-blocks.json',JSON.stringify(current(),null,2),'application/json')};
}
