// Data-only program tree shared by the block editor, live interpreter and NXC export.
export const DEFAULT_SENSORS={touch:1,sound:2,light:3,ultrasonic:4,touch2:0};
export const sensorNames={touch:'Touch',sound:'Sound % (dBA weighting)',light:'Reflected light %',ultrasonic:'Distance cm',touch2:'Second touch',encoderA:'Motor A degrees',encoderB:'Motor B degrees',encoderC:'Motor C degrees'};
export const num=value=>({kind:'number',value});
export const sensor=name=>({kind:'sensor',name});
export const variable=name=>({kind:'variable',name});
export const binary=(op,left,right)=>({kind:'binary',op,left,right});
const identifiers=/^[A-Za-z][A-Za-z0-9_]{0,19}$/;
const ops=['+','-','*','/','%','<','<=','>','>=','==','!=','and','or'];
export function checkExpression(e,depth=0){
 if(depth>12||!e||typeof e!=='object')throw Error('Expression too deeply nested or missing.');
 if(e.kind==='number'){if(!Number.isFinite(e.value)||Math.abs(e.value)>1000000)throw Error('Number outside ±1,000,000.');return {kind:e.kind,value:e.value};}
 if(e.kind==='sensor'){if(!Object.hasOwn(sensorNames,e.name))throw Error('Unknown sensor.');return {kind:e.kind,name:e.name};}
 if(e.kind==='variable'){if(!identifiers.test(e.name))throw Error('Variable names use 1–20 letters, numbers or underscores, starting with a letter.');return {kind:e.kind,name:e.name};}
 if(e.kind==='binary'&&ops.includes(e.op))return {kind:e.kind,op:e.op,left:checkExpression(e.left,depth+1),right:checkExpression(e.right,depth+1)};
 throw Error('Unknown expression.');
}
export function checkProgram(p){
 if(p?.version!==2||!Array.isArray(p.steps)||!p.steps.length)throw Error('Use a version 2 block program with at least one instruction.');
 if(p.sensors&&Object.keys(p.sensors).some(k=>!Object.hasOwn(DEFAULT_SENSORS,k)))throw Error('Unknown sensor configuration key.');
 const sensors={...DEFAULT_SENSORS,...p.sensors};const used=new Set();
 for(const key of Object.keys(DEFAULT_SENSORS)){const port=sensors[key];if(!Number.isInteger(port)||port<0||port>4)throw Error('Sensor ports must be 0 (absent) or 1–4.');if(port&&used.has(port))throw Error('Give each physical sensor its own input port.');if(port)used.add(port);}
 let count=0;
 function steps(list,depth=0){if(!Array.isArray(list)||depth>8)throw Error('Blocks are nested too deeply.');return list.map(s=>{
  if(++count>300)throw Error('Maximum 300 instruction blocks.');const n={type:s.type};if(typeof s.id==='string')n.id=s.id.slice(0,100);
  switch(s.type){
   case 'drive':n.left=checkExpression(s.left);n.right=checkExpression(s.right);n.degrees=checkExpression(s.degrees);break;
   case 'motor':if(![0,1,2].includes(s.port))throw Error('Choose motor A, B or C.');n.port=s.port;n.power=checkExpression(s.power);n.degrees=checkExpression(s.degrees);break;
   case 'wait':n.ms=checkExpression(s.ms);break;
   case 'tone':n.frequency=checkExpression(s.frequency);n.ms=checkExpression(s.ms);break;
   case 'sound':if(!/^[A-Za-z0-9_-]{1,15}\.rso$/i.test(s.file))throw Error('Sound filename must be 1–15 simple characters plus .rso.');n.file=s.file;n.ms=checkExpression(s.ms);break;
   case 'set':if(!identifiers.test(s.name))throw Error('Invalid variable name.');n.name=s.name;n.value=checkExpression(s.value);break;
   case 'sample':n.label=String(s.label||'sample').slice(0,40);n.value=checkExpression(s.value);break;
   case 'repeat':n.count=checkExpression(s.count);n.body=steps(s.body,depth+1);break;
   case 'while':n.condition=checkExpression(s.condition);n.limit=checkExpression(s.limit);n.body=steps(s.body,depth+1);break;
   case 'if':n.condition=checkExpression(s.condition);n.then=steps(s.then,depth+1);n.else=steps(s.else||[],depth+1);break;
   case 'resetEncoder':if(![0,1,2].includes(s.port))throw Error('Invalid encoder.');n.port=s.port;break;
   case 'stop':case 'coast':break;
   default:throw Error('Unknown instruction: '+s.type);
  }return n;
 });}
 return {version:2,sensors,steps:steps(p.steps)};
}
export async function evaluate(e,ctx){
 if(e.kind==='number')return e.value;
 if(e.kind==='sensor')return ctx.read(e.name);
 if(e.kind==='variable')return ctx.variables[e.name]??0;
 const a=await evaluate(e.left,ctx);if(e.op==='and'&&!a)return 0;if(e.op==='or'&&a)return 1;const b=await evaluate(e.right,ctx);
 let value;
 switch(e.op){case '+':value=a+b;break;case '-':value=a-b;break;case '*':value=a*b;break;case '/':if(!b)throw Error('Division by zero.');value=a/b;break;case '%':if(!b)throw Error('Division by zero.');value=a%b;break;case '<':return +(a<b);case '<=':return +(a<=b);case '>':return +(a>b);case '>=':return +(a>=b);case '==':return +(a===b);case '!=':return +(a!==b);case 'and':return +!!b;case 'or':return +!!b;default:throw Error('Unknown operation.');}
 if(!Number.isFinite(value)||Math.abs(value)>1000000)throw Error('Calculation outside ±1,000,000.');return value;
}
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,Math.round(n)));
export async function runProgram(program,io){
 const p=checkProgram(program),ctx={variables:Object.create(null),read:name=>io.read(name,p.sensors)};let operations=0;const start=Date.now();
 async function tick(s){io.check();if(++operations>5000||Date.now()-start>120000)throw Error('Program reached its 2-minute / 5,000-step limit.');io.highlight?.(s.id);}
 async function run(list){for(const s of list){await tick(s);const ev=e=>evaluate(e,ctx);
  switch(s.type){
   case 'drive':await io.move([[1,clamp(await ev(s.left),-60,60)],[2,clamp(await ev(s.right),-60,60)]],clamp(await ev(s.degrees),1,720));break;
   case 'motor':await io.move([[s.port,clamp(await ev(s.power),-60,60)]],clamp(await ev(s.degrees),1,720));break;
   case 'wait':await io.wait(clamp(await ev(s.ms),0,10000));break;
   case 'tone':await io.tone(clamp(await ev(s.frequency),200,14000),clamp(await ev(s.ms),1,5000));break;
   case 'sound':await io.sound(s.file,clamp(await ev(s.ms),1,8000));break;
   case 'set':ctx.variables[s.name]=await ev(s.value);io.variables?.(ctx.variables);break;
   case 'sample':io.sample(s.label,await ev(s.value));break;
   case 'resetEncoder':await io.resetEncoder(s.port);break;
   case 'stop':await io.brake(false);break;
   case 'coast':await io.brake(true);break;
   case 'repeat':{const count=clamp(await ev(s.count),0,100);for(let i=0;i<count;i++){await tick(s);await run(s.body);await io.wait(5);}break;}
   case 'while':{const limit=clamp(await ev(s.limit),1,100);let i=0;while(await ev(s.condition)){await tick(s);if(i++>=limit)throw Error('While-loop limit reached. Inspect its condition.');await run(s.body);await io.wait(5);}break;}
   case 'if':await run(await ev(s.condition)?s.then:s.else);break;
  }
 }}
 await run(p.steps);return ctx.variables;
}
export function fromSequence(p,power=35,sensors=DEFAULT_SENSORS){
 const steps=p.steps.map(s=>{
  if(s.type==='wait')return {type:'wait',ms:num(s.value*1000)};
  if(s.type==='tone')return {type:'tone',frequency:num(s.value),ms:num(300)};
  if(s.type==='touch')return {type:'while',condition:binary('==',sensor('touch'),num(0)),limit:num(s.value*10),body:[{type:'wait',ms:num(100)}]};
  if(s.type==='motorA')return {type:'motor',port:0,power:num(power),degrees:num(s.value)};
  return {type:'drive',left:num((s.type==='left'||s.type==='backward'?-1:1)*power),right:num((s.type==='right'||s.type==='backward'?-1:1)*power),degrees:num(s.value)};
 });return checkProgram({version:2,sensors,steps:[{type:'repeat',count:num(p.repeat),body:steps}]});
}
export function csv(rows){const cell=v=>'"'+String(v).replaceAll('"','""')+'"';return [['elapsed_ms','source','label','value'],...rows.map(r=>[r.time,r.source,r.label,r.value])].map(row=>row.map(cell).join(',')).join('\r\n');}
