import {checkProgram} from './program.mjs';
// NXC export requires the free NBC/NXC compiler. This is source, never a disguised .rxe.
export function toNxc(input){
 const p=checkProgram(input);let index=0;const vars=new Set();
 function expr(e){if(e.kind==='number')return String(e.value);if(e.kind==='variable'){vars.add(e.name);return 'v_'+e.name;}if(e.kind==='sensor'){if(e.name.startsWith('encoder'))return `MotorRotationCount(OUT_${e.name.at(-1)})`;const port=p.sensors[e.name];if(!port)throw Error(e.name+' sensor is absent.');return e.name==='ultrasonic'?`SensorUS(IN_${port})`:`Sensor(IN_${port})`;}
  const a=expr(e.left),b=expr(e.right);if(e.op==='/')return `labDiv(${a}, ${b})`;if(e.op==='%')return `labMod(${a}, ${b})`;return `(${a} ${{'and':'&&','or':'||','==':'==','!=':'!='}[e.op]||e.op} ${b})`;}
 function block(list,depth=1){const pad='  '.repeat(depth);return list.map(s=>{const n=index++;switch(s.type){
  case 'drive':return `${pad}labMove(OUT_B, ${expr(s.left)}, OUT_C, ${expr(s.right)}, ${expr(s.degrees)});`;
  case 'motor':return `${pad}labMove(OUT_${'ABC'[s.port]}, ${expr(s.power)}, OUT_${'ABC'[s.port]}, 0, ${expr(s.degrees)});`;
  case 'wait':return `${pad}Wait(labClamp(${expr(s.ms)}, 0, 10000));`;
  case 'tone':return `${pad}PlayTone(labClamp(${expr(s.frequency)},200,14000),labClamp(${expr(s.ms)},1,5000));\n${pad}Wait(labClamp(${expr(s.ms)},1,5000));`;
  case 'sound':return `${pad}PlayFile(${JSON.stringify(s.file)});\n${pad}Wait(labClamp(${expr(s.ms)},1,8000));`;
  case 'set':vars.add(s.name);return `${pad}v_${s.name} = labValue(${expr(s.value)});`;
  case 'sample':return `${pad}TextOut(0, LCD_LINE1, ${JSON.stringify(s.label.replace(/[^A-Za-z0-9 _-]/g,'').slice(0,16))}, true);\n${pad}NumOut(0, LCD_LINE3, ${expr(s.value)}); // Browser CSV becomes LCD output on the brick.`;
  case 'stop':return `${pad}OffEx(OUT_ABC,RESET_NONE);`;
  case 'coast':return `${pad}CoastEx(OUT_ABC,RESET_NONE);`;
  case 'resetEncoder':return `${pad}ResetRotationCount(OUT_${'ABC'[s.port]});`;
  case 'repeat':return `${pad}int count${n}=labClamp(${expr(s.count)},0,100);\n${pad}for(int i${n}=0; i${n}<count${n}; i${n}++){\n${block(s.body,depth+1)}\n${pad}  Wait(5);\n${pad}}`;
  case 'while':return `${pad}int limit${n}=labClamp(${expr(s.limit)},1,100);\n${pad}int i${n}=0;\n${pad}while(${expr(s.condition)}){\n${pad}  if(i${n}++ >= limit${n}){ OffEx(OUT_ABC,RESET_NONE); StopAllTasks(); }\n${block(s.body,depth+1)}\n${pad}  Wait(5);\n${pad}}`;
  case 'if':return `${pad}if(${expr(s.condition)}){\n${block(s.then,depth+1)}\n${pad}}else{\n${block(s.else,depth+1)}\n${pad}}`;
 }}).join('\n');}
 const body=block(p.steps);
 const setup=Object.entries(p.sensors).filter(([,port])=>port).map(([kind,port])=>`  ${kind==='ultrasonic'?'SetSensorUltrasonic':kind==='light'?'SetSensorLight':kind==='sound'?'SetSensorSound':'SetSensorTouch'}(IN_${port}${kind==='sound'?',false':''});`).join('\n');
 return `// NXT Robot Lab — stock firmware 1.28+; compile with NBC/NXC, then send the .rxe.\n// Browser sensor samples display on the brick LCD in standalone mode; CSV stays browser-only.\n// Keep an adult at the power button. Test each mechanism with wheels lifted.\n${[...vars].map(v=>'float v_'+v+'=0;').join('\n')}\n
int labMin(int a,int b){ if(a<b)return a; return b; }
int labMax(int a,int b){ if(a>b)return a; return b; }
int labClamp(float v,int lo,int hi){ int r=v; if(v-r>=0.5)r++; if(v-r< -0.5)r--; return labMax(lo,labMin(hi,r)); }
float labValue(float v){ if(abs(v)>1000000){ OffEx(OUT_ABC,RESET_NONE); StopAllTasks(); } return v; }
float labDiv(float a,float b){ if(b==0){ OffEx(OUT_ABC,RESET_NONE); StopAllTasks(); } return labValue(a/b); }
float labMod(float a,float b){ if(b==0){ OffEx(OUT_ABC,RESET_NONE); StopAllTasks(); } int q=a/b; return labValue(a-q*b); }
void labMove(byte a,int pa,byte b,int pb,int amount){
  int degrees=labClamp(amount,1,720); pa=labClamp(pa,-60,60); pb=labClamp(pb,-60,60);
  int fastest=labMax(abs(pa),abs(pb)); fastest=labMax(1,fastest);
  int targetA=labMax(1,labClamp(degrees*1.0*abs(pa)/fastest,1,720)); int targetB=labMax(1,labClamp(degrees*1.0*abs(pb)/fastest,1,720));
  long startA=MotorRotationCount(a); long startB=MotorRotationCount(b); long begin=CurrentTick();
  OnFwdEx(a,pa,RESET_NONE); if(b!=a) OnFwdEx(b,pb,RESET_NONE);
  bool doneA=(pa==0); bool doneB=(pb==0 || a==b);
  while(!doneA || !doneB){
    if(!doneA && abs(MotorRotationCount(a)-startA)>=targetA){ OffEx(a,RESET_NONE); doneA=true; }
    if(!doneB && abs(MotorRotationCount(b)-startB)>=targetB){ OffEx(b,RESET_NONE); doneB=true; }
    if(CurrentTick()-begin>10000){ OffEx(OUT_ABC,RESET_NONE); StopAllTasks(); }
    Wait(5);
  }
  OffEx(a,RESET_NONE); if(b!=a) OffEx(b,RESET_NONE);
}
task labWatchdog(){ Wait(120000); OffEx(OUT_ABC,RESET_NONE); StopAllTasks(); }
task main(){
  start labWatchdog;
${setup}
  Wait(300);
${body}
  OffEx(OUT_ABC,RESET_NONE);
  stop labWatchdog;
}
`;
}
