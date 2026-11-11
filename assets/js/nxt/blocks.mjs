import {checkProgram,DEFAULT_SENSORS,sensorNames} from './program.mjs';
const ports=[['A','0'],['B','1'],['C','2']];
const val=name=>({type:'input_value',name,check:'Number'}),statement=name=>({type:'input_statement',name});
const number=(name,value,min,max)=>({type:'field_number',name,value,min,max});
export function createBlocks(element,onChange){
 const B=window.Blockly;
 const defs=[
  {type:'nxt_start',message0:'when Run is pressed %1 %2',args0:[{type:'input_dummy'},statement('BODY')],colour:30},
  {type:'nxt_drive',message0:'drive left %1 right %2 for %3 motor degrees',args0:[val('LEFT'),val('RIGHT'),val('DEGREES')],colour:30},
  {type:'nxt_motor',message0:'motor %1 power %2 rotate %3 degrees',args0:[{type:'field_dropdown',name:'PORT',options:ports},val('POWER'),val('DEGREES')],colour:30},
  {type:'nxt_wait',message0:'wait %1 milliseconds',args0:[val('MS')],colour:160},
  {type:'nxt_tone',message0:'play tone %1 Hz for %2 ms',args0:[val('FREQUENCY'),val('MS')],colour:225},
  {type:'nxt_sound',message0:'play sound file %1 wait %2 ms',args0:[{type:'field_input',name:'FILE',text:'hello.rso'},val('MS')],colour:225},
  {type:'nxt_repeat',message0:'repeat %1 times %2',args0:[val('COUNT'),statement('BODY')],colour:160},
  {type:'nxt_while',message0:'while %1 at most %2 times %3',args0:[val('CONDITION'),val('LIMIT'),statement('BODY')],colour:160},
  {type:'nxt_if',message0:'if %1 then %2 else %3',args0:[val('CONDITION'),statement('THEN'),statement('ELSE')],colour:160},
  {type:'nxt_set',message0:'set %1 to %2',args0:[{type:'field_input',name:'NAME',text:'score'},val('VALUE')],colour:285},
  {type:'nxt_sample',message0:'record %1 value %2',args0:[{type:'field_input',name:'LABEL',text:'measurement'},val('VALUE')],colour:285},
  {type:'nxt_resetEncoder',message0:'reset motor %1 encoder',args0:[{type:'field_dropdown',name:'PORT',options:ports}],colour:285},
  {type:'nxt_stop',message0:'brake all motors',colour:0},
  {type:'nxt_coast',message0:'release motors for hand measurement',colour:0},
  {type:'nxt_number',message0:'%1',args0:[number('VALUE',30,-1000000,1000000)],output:'Number',colour:210},
  {type:'nxt_sensor',message0:'read %1',args0:[{type:'field_dropdown',name:'NAME',options:Object.entries(sensorNames).map(([k,v])=>[v,k])}],output:'Number',colour:190},
  {type:'nxt_variable',message0:'variable %1',args0:[{type:'field_input',name:'NAME',text:'score'}],output:'Number',colour:285},
  {type:'nxt_binary',message0:'%1 %2 %3',args0:[val('LEFT'),{type:'field_dropdown',name:'OP',options:['+','-','*','/','%','<','<=','>','>=','==','!=','and','or'].map(x=>[x,x])},val('RIGHT')],output:'Number',colour:210},
 ].map(d=>d.type==='nxt_start'||d.output?d:{...d,previousStatement:null,nextStatement:null});
 B.defineBlocksWithJsonArray(defs);
 const shadow=value=>({shadow:{type:'nxt_number',fields:{VALUE:value}}});
 const defaults={drive:{LEFT:30,RIGHT:30,DEGREES:90},motor:{POWER:25,DEGREES:90},wait:{MS:100},tone:{FREQUENCY:440,MS:200},sound:{MS:1000},repeat:{COUNT:4},while:{CONDITION:1,LIMIT:100},if:{CONDITION:1},set:{VALUE:0},sample:{VALUE:0},binary:{LEFT:0,RIGHT:0}};
 const entry=type=>({kind:'block',type:'nxt_'+type,inputs:Object.fromEntries(Object.entries(defaults[type]||{}).map(([key,v])=>[key,shadow(v)]))});
 const categories=[['Motors',30,['drive','motor','stop','coast','resetEncoder']],['Logic',160,['repeat','while','if','wait']],['Sensors',190,['sensor']],['Sound',225,['tone','sound']],['Math & data',285,['number','binary','variable','set','sample']]];
 const ws=B.inject(element,{toolbox:{kind:'categoryToolbox',contents:categories.map(([name,colour,types])=>({kind:'category',name,colour,contents:types.map(entry)}))},renderer:'zelos',sounds:false,trashcan:true,maxBlocks:600,media:new URL('../../vendor/blockly-media/',import.meta.url).href,zoom:{controls:true,wheel:false,startScale:.7,minScale:.35,maxScale:1.4},move:{scrollbars:true,drag:true,wheel:true}});
 element.querySelectorAll('.blocklyToolboxCategory[id]').forEach(row=>{if(row.parentElement?.id===row.id)row.removeAttribute('id');});
 let loading=false,readOnly=false;
 ws.addChangeListener(event=>{if(!loading&&!readOnly&&!event.isUiEvent)onChange();});
 function expression(block){if(!block)throw Error('Connect a number, sensor or variable to each empty socket.');const kind=block.type.slice(4);const field=k=>block.getFieldValue(k);
  if(kind==='number')return {kind,value:Number(field('VALUE'))};
  if(kind==='sensor'||kind==='variable')return {kind,name:field('NAME')};
  if(kind==='binary')return {kind,op:field('OP'),left:expression(block.getInputTargetBlock('LEFT')),right:expression(block.getInputTargetBlock('RIGHT'))};
  throw Error('Unknown value block.');
 }
 function chain(block){const out=[];while(block){if(block.isEnabled()){
  const type=block.type.slice(4),s={type,id:block.id},field=k=>block.getFieldValue(k),value=k=>expression(block.getInputTargetBlock(k));
  if(type==='drive'){s.left=value('LEFT');s.right=value('RIGHT');s.degrees=value('DEGREES');}
  else if(type==='motor'){s.port=Number(field('PORT'));s.power=value('POWER');s.degrees=value('DEGREES');}
  else if(type==='wait')s.ms=value('MS');
  else if(type==='tone'){s.frequency=value('FREQUENCY');s.ms=value('MS');}
  else if(type==='sound'){s.file=field('FILE');s.ms=value('MS');}
  else if(type==='repeat'){s.count=value('COUNT');s.body=chain(block.getInputTargetBlock('BODY'));}
  else if(type==='while'){s.condition=value('CONDITION');s.limit=value('LIMIT');s.body=chain(block.getInputTargetBlock('BODY'));}
  else if(type==='if'){s.condition=value('CONDITION');s.then=chain(block.getInputTargetBlock('THEN'));s.else=chain(block.getInputTargetBlock('ELSE'));}
  else if(type==='set'){s.name=field('NAME');s.value=value('VALUE');}
  else if(type==='sample'){s.label=field('LABEL');s.value=value('VALUE');}
  else if(type==='resetEncoder')s.port=Number(field('PORT'));
  else if(!['stop','coast'].includes(type))throw Error('Unexpected block in the program.');out.push(s);
 }block=block.getNextBlock();}return out;}
 function program(sensors=DEFAULT_SENSORS){const tops=ws.getTopBlocks(false);if(tops.length!==1||tops[0].type!=='nxt_start')throw Error('Connect every block to the single “when Run is pressed” stack.');return checkProgram({version:2,sensors,steps:chain(tops[0].getInputTargetBlock('BODY'))});}
 function expressionState(e){if(e.kind==='number')return {type:'nxt_number',fields:{VALUE:e.value}};if(['sensor','variable'].includes(e.kind))return {type:'nxt_'+e.kind,fields:{NAME:e.name}};return {type:'nxt_binary',fields:{OP:e.op},inputs:{LEFT:{block:expressionState(e.left)},RIGHT:{block:expressionState(e.right)}}};}
 function chainState(steps){if(!steps.length)return null;const [s,...rest]=steps,state={type:'nxt_'+s.type,fields:{},inputs:{}};const e=(k,v)=>state.inputs[k]={block:expressionState(v)},body=(k,list)=>{const b=chainState(list);if(b)state.inputs[k]={block:b};};
  if(s.type==='drive'){e('LEFT',s.left);e('RIGHT',s.right);e('DEGREES',s.degrees);}
  if(s.type==='motor'){state.fields.PORT=String(s.port);e('POWER',s.power);e('DEGREES',s.degrees);}
  if(['wait','tone','sound'].includes(s.type))e('MS',s.ms);
  if(s.type==='tone')e('FREQUENCY',s.frequency);
  if(s.type==='sound')state.fields.FILE=s.file;
  if(s.type==='repeat'){e('COUNT',s.count);body('BODY',s.body);}
  if(s.type==='while'){e('CONDITION',s.condition);e('LIMIT',s.limit);body('BODY',s.body);}
  if(s.type==='if'){e('CONDITION',s.condition);body('THEN',s.then);body('ELSE',s.else);}
  if(s.type==='set'){state.fields.NAME=s.name;e('VALUE',s.value);}
  if(s.type==='sample'){state.fields.LABEL=s.label;e('VALUE',s.value);}
  if(s.type==='resetEncoder')state.fields.PORT=String(s.port);
  if(rest.length)state.next={block:chainState(rest)};return state;
 }
 function load(p){const valid=checkProgram(p);loading=true;try{ws.clear();const first=chainState(valid.steps);B.serialization.blocks.append({type:'nxt_start',x:30,y:25,inputs:first?{BODY:{block:first}}:{}},ws);const root=ws.getTopBlocks(false)[0];root.setDeletable(false);ws.scroll(16,16);}finally{loading=false;}resize();}
 function resize(){B.svgResize(ws);}
 window.addEventListener('resize',resize);document.addEventListener('creation-app-resize',resize);
 return {program,load,resize,highlight:id=>ws.highlightBlock(id||null),busy:busy=>{readOnly=busy;ws.options.readOnly=busy;ws.getAllBlocks(false).forEach(b=>{b.setMovable(!busy);b.setEditable(!busy);b.setDeletable(!busy&&b.type!=='nxt_start');});element.inert=busy;},dispose:()=>ws.dispose()};
}
