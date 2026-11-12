import { buildField, meshField } from './body-field.mjs';
import { humanoidLayout } from './humanoid.mjs';

// Primitive-based styles share the humanoid landmarks used by the export rig.
export function buildStyledCharacter(T,group,p,state){
 const L=humanoidLayout(p),{H,hipY,neckY,shoulderY,headY,sH,hipHalf,kneeY}=L;
 const style=Math.round(p.artStyle),block=style===1,stick=style===2,fur=state.color,cloth=state.secondary;
 const organic=style===3,bodyPrims=[];
 const rgb=hex=>{const c=new T.Color(hex);return [c.r,c.g,c.b];};
 const core=new Set(['Tailored jacket silhouette','Neck','Shoulder','Contoured upper arm','Tapered forearm','Palm','Separated finger','Hip','Shaped thigh','Calf and ankle','Foot','Elbow','Knee','Sleeve cap','Thumb']);
 const add=(geo,pos,color,name)=>{const clothPart=/jacket|pocket|lapel|Sleeve|arm|thigh|ankle|Knee|Shoulder|Hip/.test(name),eyePart=/Eye|Iris|Pupil|Catchlight/.test(name);const m=new T.Mesh(geo,new T.MeshPhysicalMaterial({color,roughness:eyePart?.22:clothPart?.82:.57,clearcoat:eyePart?.35:.025,clearcoatRoughness:.6,envMapIntensity:eyePart?.8:.45}));m.position.set(...pos);m.name=name;m.castShadow=true;m.receiveShadow=true;if(!(organic&&core.has(name)))group.add(m);else{geo.dispose();m.material.dispose();}return m;};
 const ball=(pos,r,color,name,scale=[1,1,1])=>{if(organic&&core.has(name))bodyPrims.push({type:'ell',c:pos,r:scale.map(v=>v*r),color:rgb(color),k:name==='Palm'?.035:.055});const m=add(new T.SphereGeometry(r,40,28),pos,color,name);m.scale.set(...scale);return m;};
 const rounded=(w,h,d,r=.06)=>{
  r=Math.min(r,w*.22,h*.22,d*.22);const shape=new T.Shape(),x=w/2-r,y=h/2-r;
  shape.moveTo(-x,-y-r);shape.lineTo(x,-y-r);shape.quadraticCurveTo(x+r,-y-r,x+r,-y);shape.lineTo(x+r,y);shape.quadraticCurveTo(x+r,y+r,x,y+r);shape.lineTo(-x,y+r);shape.quadraticCurveTo(-x-r,y+r,-x-r,y);shape.lineTo(-x-r,-y);shape.quadraticCurveTo(-x-r,-y-r,-x,-y-r);
  const g=new T.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3,curveSegments:8});g.translate(0,0,-d/2+r);g.computeVertexNormals();return g;
 };
 const box=(pos,size,color,name)=>add(rounded(...size),pos,color,name);
 const link=(a,b,r,color,name)=>{if(organic&&core.has(name))bodyPrims.push({type:'cap',a,b,ra:r,rb:r,color:rgb(color),k:.12});const va=new T.Vector3(...a),vb=new T.Vector3(...b),delta=vb.clone().sub(va);const m=add(block?rounded(r*2,delta.length(),r*2,.035):new T.CapsuleGeometry(r,Math.max(.01,delta.length()-r*2),8,24),va.clone().add(vb).multiplyScalar(.5).toArray(),color,name);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;};
 // Ring-built surfaces give silhouettes deliberate changes of plane and volume.
 const loft=(rings,color,name,segments=40)=>{
  if(organic&&name==='Tailored jacket silhouette'){
   for(const [y,rx,ry,rz] of [[hipY+.08,hipHalf*1.04,.23,.28],[hipY+p.torso*.3,sH*.76,p.torso*.25,.30],[hipY+p.torso*.58,sH*.93,p.torso*.25,.37],[shoulderY-.035,sH,.20,.32]])bodyPrims.push({type:'ell',c:[0,y,0],r:[rx,ry,rz],color:rgb(color),k:.16});
  }
  const vertices=[],indices=[];
  for(const [y,rx,rz,cx=0,cz=0] of rings)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;vertices.push(cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz);}
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
  for(const [row,reverse] of [[0,true],[rings.length-1,false]]){const r=rings[row],center=vertices.length/3;vertices.push(r[3]||0,r[0],r[4]||0);for(let i=0;i<segments;i++){const a=row*(segments+1)+i;indices.push(center,reverse?a:a+1,reverse?a+1:a);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return add(geo,[0,0,0],color,name);
 };
 const tapered=(a,b,radii,color,name)=>{
  const va=new T.Vector3(...a),vb=new T.Vector3(...b),length=va.distanceTo(vb);
  if(organic&&core.has(name)){
   // Use one tapered volume per limb; short overlapping capsules make swollen rings.
   const finger=name==='Separated finger',ra=radii[1][1]*(finger?1:.94),rb=radii.at(-1)[1];
   const direction=vb.clone().sub(va).normalize();
   bodyPrims.push({type:'cap',a:va.clone().addScaledVector(direction,ra*.55).toArray(),b:vb.clone().addScaledVector(direction,-rb*.4).toArray(),ra,rb,color:rgb(color),k:finger?.012:.065});
  }
  const m=loft(radii.map(([t,r])=>[t*length,r,r*.87]),color,name,32);m.position.copy(va);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vb.sub(va).normalize());return m;
 };
 const curve=(points,r,color,name)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),32,r,10,false),[0,0,0],color,name);
 const earShape=(side,inner=false)=>{
  const shape=new T.Shape();shape.moveTo(-.23*H,0);shape.bezierCurveTo(-.24*H,p.ears*.28,-.14*H,p.ears*.75,.02*H,p.ears);shape.bezierCurveTo(.14*H,p.ears*.65,.24*H,p.ears*.22,.23*H,0);shape.quadraticCurveTo(0,-.12*H,-.23*H,0);
  const geo=new T.ExtrudeGeometry(shape,{depth:inner?.025:.10,bevelEnabled:true,bevelSize:inner?.015:.045,bevelThickness:.035,bevelSegments:4,curveSegments:16});
  const m=add(geo,[side*H*.36,headY+H*.4,inner?.13:0],inner?'#d49587':fur,inner?'Inset ear cartilage':'Sculpted ear');m.rotation.z=-side*.18;if(inner)m.scale.set(.65,.72,.6);return m;
 };
 if(block)box([0,hipY+p.torso*.47,0],[sH*2,p.torso,.62],cloth,'Block torso');
 else if(stick)link([0,hipY,0],[0,neckY,0],.09,cloth,'Stick torso');
 else loft([[hipY-.12,hipHalf,.27],[hipY+.06,hipHalf*1.12,.33],[hipY+p.torso*.22,sH*.7,.32],[hipY+p.torso*.48,sH*.86,.39],[hipY+p.torso*.72,sH*.98,.42],[shoulderY,sH,.34],[neckY-.08,.24,.20],[neckY,.18,.17]],cloth,'Tailored jacket silhouette');
 link([0,neckY-.1,0],[0,headY-H*.25,0],stick?.09:.16,fur,'Neck');
 if(block)box([0,headY,0],[H*.95,H,H*.85],fur,'Block head');
 else if(stick)ball([0,headY,0],H*.45,fur,'Head');
 else {
  const color=hex=>{const c=new T.Color(hex);return [c.r,c.g,c.b];},prims=[];
  const ell=(x,y,z,rx,ry,rz,c=fur,k=.08,carve=false)=>prims.push({type:'ell',c:[x*H,headY+y*H,z*H],r:[rx*H,ry*H,rz*H],color:color(c),k:k*H,carve});
  ell(0,.10,-.06,.49,.49,.43);ell(0,-.17,.05,.36,.31,.34);
  ell(0,-.34,.22,.23,.15,.22,'#f0d9ba');
  for(const side of [-1,1]){
   ell(side*.31,-.05,.20,.23,.22,.25);ell(side*.14,-.15,.36+p.muzzle*.2,.22,.16,.17+p.muzzle*.2,'#f0d9ba',.12);
   ell(side*.19,.25,.32,.16,.12,.15,fur,.07);
   ell(side*.20,.16,.43,.115,.13,.10,fur,.035,true);
  }
  for(const side of [-1,1]){
   // Overlapping tapered masses blend ear roots and cheek tufts into the skull.
   for(let i=0;i<7;i++){const t=i/6;ell(side*(.34+t*.17),.38+t*p.ears/H,.0,.23*(1-t)+.025,.13,.105*(1-t)+.025,fur,.075);}
   for(let i=0;i<3;i++)ell(side*(.40+i*.035),-.12-i*.05,.03,.105-i*.025,.075-i*.014,.12-i*.02,fur,.065);
  }
  ell(0,-.04,.48,.14,.12,.20);ell(0,-.07,.65,.105,.065,.075,'#26313a',.025);
  const data=meshField(buildField(prims,{cell:H*.018,floor:headY-H*.56,tau:.003}));
  const geo=new T.BufferGeometry();for(const [key,values] of [['position',data.positions],['normal',data.normals],['color',data.colors]])geo.setAttribute(key,new T.BufferAttribute(values,3));geo.setIndex(new T.BufferAttribute(data.indices,1));
  const head=add(geo,[0,0,0],'#ffffff','Sculpted mascot head');head.material.vertexColors=true;head.material.roughness=.64;head.material.clearcoat=0;
 }
 for(const side of [-1,1]){
  const shoulder=[side*sH,shoulderY,0],elbow=[side*(sH+p.arm*.17),shoulderY-p.arm*.47,.05],wrist=[side*(sH+p.arm*.25),shoulderY-p.arm*.92,.14];
  link([0,shoulderY,0],shoulder,stick?.085:.17,cloth,'Shoulder');
  if(block){link(shoulder,elbow,.17,cloth,'Upper arm');link(elbow,wrist,.14,fur,'Forearm');}
  else {tapered(shoulder,elbow,[[0,stick?.09:.21],[.18,stick?.075:.24],[.55,stick?.055:.19],[.92,stick?.065:.145],[1,stick?.075:.14]],cloth,'Contoured upper arm');tapered(elbow,wrist,[[0,stick?.075:.14],[.22,stick?.08:.18],[.55,stick?.055:.15],[.9,stick?.06:.10],[1,stick?.07:.10]],fur,'Tapered forearm');}
  if(block)box([wrist[0],wrist[1]-.12,wrist[2]],[.3,.32,.3],fur,'Hand');else {ball([wrist[0],wrist[1]-.09,wrist[2]],stick?.10:.15,fur,'Palm',[1,1.3,.65]);for(let finger=0;finger<4;finger++){const fx=wrist[0]+(finger-1.5)*(stick?.038:.065),length=(finger===0||finger===3?.17:.23)*(stick?.7:1);tapered([fx,wrist[1]-.15,wrist[2]+.025],[fx,wrist[1]-.15-length,wrist[2]+.07],[[0,.033],[.45,.035],[.86,.028],[1,.012]],fur,'Separated finger');}}
  const x=side*hipHalf*.55,hip=[x,hipY,0],knee=[x,kneeY,.03],ankle=[x,.3,0];
  link([0,hipY,0],hip,stick?.08:.2,cloth,'Hip');if(block){link(hip,knee,.2,cloth,'Thigh');link(knee,ankle,.17,cloth,'Shin');}else{tapered(hip,knee,[[0,stick?.085:.24],[.2,stick?.075:.255],[.6,stick?.055:.22],[1,stick?.08:.17]],cloth,'Shaped thigh');tapered(knee,ankle,[[0,stick?.08:.17],[.25,stick?.07:.20],[.55,stick?.05:.16],[1,stick?.075:.105]],cloth,'Calf and ankle');}
  if(block)box([x,.15,.13],[.4,.3,.65],fur,'Foot');else ball([x,.15,.16],stick?.14:.26,fur,'Foot',[1,.65,1.5]);
  if(stick)for(const pos of [shoulder,elbow,knee,wrist]){const joint=ball(pos,.105,'#788998','Articulated joint');joint.material.metalness=.8;joint.material.roughness=.25;}
  else {
   if(!block){ball(elbow,.155,fur,'Elbow');ball(knee,.18,cloth,'Knee');}
   ball(shoulder,block?.19:.24,cloth,'Sleeve cap');
   link([wrist[0],wrist[1]+.1,wrist[2]],wrist,block?.16:.12,'#d8b97b','Cuff trim');
   box([x,.07,.17],[block?.42:.46,.12,.65],'#24303d','Boot sole');
   link([x,.29,.03],[x,.42,.02],block?.18:.19,'#384b5b','Boot collar');
   ball([wrist[0]-side*.11,wrist[1]-.05,wrist[2]+.08],.09,fur,'Thumb');
  }
  const eyeX=side*H*.2,eyeY=headY+H*(style===3?.16:.08),front=block?H*.43:H*(stick?.41:.43),er=H*.065*p.eyes;
  const eye=ball([eyeX,eyeY,front],er*(style===3?1.35:1.15),'#fff8ed','Eye',[1,1.18,.6]);eye.material.roughness=.16;eye.material.clearcoat=1;
  if(style===3){const lid=[];for(let i=0;i<=12;i++){const a=i/12*Math.PI;lid.push([eyeX+Math.cos(a)*er*1.35,eyeY+Math.sin(a)*er*1.55,front+.012]);}curve(lid,er*.18,fur,'Upper eyelid rim');}
  const irisZ=front+er*.98;
  const iris=ball([eyeX,eyeY,irisZ],er*.68,stick?'#55cbe5':'#628b73','Iris',[1,1,.24]);iris.material.roughness=.2;
  ball([eyeX,eyeY,irisZ+er*.16],er*.36,'#101c26','Pupil',[1,1,.25]);
  ball([eyeX-er*.22,eyeY+er*.3,irisZ+er*.27],er*.18,'#ffffff','Catchlight');
  link([eyeX-side*er*.9,eyeY+er*1.8,front],[eyeX+side*er*.9,eyeY+er*(1.9+(p.brows||0)/30),front-.015],er*.22,stick?'#243b50':'#533b30','Expressive brow');
  if(style===3){
   earShape(side,true);

  }
 }
 // Construction details remain actual exportable geometry, including the back view.
 for(const side of [-1,1]){
  const x=side*hipHalf*.55;
  if(!stick){
   box([x,.19,.23],[block?.37:.39,.22,.51],'#415365','Boot upper');
   box([x,.17,.47],[.34,.16,.18],'#71828c','Toe guard');
   for(let i=0;i<3;i++)link([x-.11,.31-i*.025,.13+i*.085],[x+.11,.31-i*.025,.13+i*.085],.014,'#dfd1b1','Boot lace');
   box([side*sH*.46,hipY+p.torso*.44,block?.35:.335],[.27,.27,.07],cloth,'Raised jacket pocket');
   box([side*sH*.46,hipY+p.torso*.54,block?.40:.37],[.29,.07,.07],'#324554','Pocket flap');
   box([side*(hipHalf+.08),hipY-.12,0],[.20,.32,.28],'#324554','Utility pouch');
   if(block){
    box([side*H*.49,headY-.03,0],[.12,.25,.27],fur,'Angular ear');
    box([side*H*.27,headY+H*.49,0],[H*.46,.16,H*.89],'#344251','Layered hair cap');
    box([side*H*.34,headY+H*.28,H*.40],[H*.18,H*.32,.12],'#344251','Angular fringe');
    box([side*sH,shoulderY+.04,.03],[.43,.18,.48],'#324554','Shoulder armor');
    box([x,kneeY,.20],[.29,.33,.09],'#526b7c','Knee plate');
   }else{
    // Cheek fur is sculpted into the head field above.
    curve([[side*.18,neckY-.08,.20],[side*.3,neckY-.25,.32],[side*.13,neckY-.40,.4]],.035,'#dfd1b1','Folded lapel');
   }
  }else{
   const hipSocket=ball([x,hipY,0],.12,'#788998','Hip socket');hipSocket.material.metalness=.8;
   box([x,.10,.12],[.23,.18,.43],'#31485c','Articulated shoe');
   curve([[side*.10,hipY+.1,.03],[side*.14,hipY+p.torso*.4,.07],[side*.12,shoulderY-.1,.04]],.025,'#acc9d5','Exposed torso cable');
   const ear=ball([side*H*.43,headY,0],H*.09,'#788998','Head hinge',[.5,1,1]);ear.material.metalness=.8;
  }
 }
 if(block){
  box([0,headY-H*.08,H*.45],[H*.13,H*.16,.12],fur,'Sculpted block nose');
  box([0,hipY+p.torso*.53,-.40],[sH*1.3,p.torso*.65,.25],'#324554','Backpack');
  box([0,hipY+p.torso*.80,-.43],[sH*1.35,.13,.30],'#526b7c','Backpack flap');
  for(const side of [-1,1])box([side*sH*.58,hipY+p.torso*.60,.34],[.08,p.torso*.7,.07],'#dfd1b1','Harness strap');
 }
 if(stick){
  const rim=new T.TorusGeometry(H*.43,.018,12,64);const shell=add(rim,[0,headY,.05],'#adc4ce','Head shell seam');shell.rotation.y=Math.PI/2;
  box([0,hipY+p.torso*.74,.10],[.16,.27,.10],'#263c50','Chest control module');
  for(let i=0;i<3;i++)ball([0,hipY+p.torso*.69+i*.07,.17],.018,'#74e5e2','Module indicator');
 }
 if(!stick){
  const chestZ=block?.33:.41;
  box([0,hipY+p.torso*.72,chestZ],[.26,.3,.055],'#d8b97b','Chest badge');
  box([0,hipY+p.torso*.72,chestZ+.035],[.12,.15,.025],'#e9f0ec','Badge inset');
  for(const side of [-1,1])link([side*.12,neckY-.06,.15],[side*.23,neckY-.23,.28],.07,'#d8b97b','Collar');
  for(let i=0;i<3;i++)ball([0,hipY+p.torso*(.3+i*.13),block?.33:.425],.026,'#adc3cc','Jacket fastener');
  box([0,hipY+.1,.01],[hipHalf*2,.14,block?.66:.76],'#283b4a','Waistband');
 }
 if(style===3){
  const smile=new T.CatmullRomCurve3([[-H*.17,headY-H*.27,H*.49],[0,headY-H*.29,H*(.48+p.muzzle*.25)],[H*.17,headY-H*.27,H*.49]].map(v=>new T.Vector3(...v)));add(new T.TubeGeometry(smile,24,.012,8,false),[0,0,0],'#533b30','Smile');

  if(p.tail>0){
   const rings=[];for(let i=0;i<=24;i++){const t=i/24,r=.035+Math.sin(Math.PI*t)**.7*.25;rings.push([hipY+t*.75,r,r,Math.sin(t*Math.PI)*.22,-.25-t*p.tail]);}
   const tailParts=[];for(let i=0;i<rings.length-1;i++){const a=rings[i],b=rings[i+1];tailParts.push({type:'cap',a:[a[3],a[0],a[4]],b:[b[3],b[0],b[4]],ra:a[1],rb:b[1],color:rgb(i<18?fur:'#f8e6cd'),k:.035});}
   const data=meshField(buildField(tailParts,{cell:.025,floor:0,tau:.003})),geo=new T.BufferGeometry();for(const [key,values] of [['position',data.positions],['normal',data.normals],['color',data.colors]])geo.setAttribute(key,new T.BufferAttribute(values,3));geo.setIndex(new T.BufferAttribute(data.indices,1));const tail=add(geo,[0,0,0],'#ffffff','Continuous bushy tail');tail.material.vertexColors=true;tail.material.roughness=.8;
  }
 }else box([0,headY-H*.19,H*(block?.435:.435)],[H*.2,.025,.025],'#26313a','Mouth');
 if(organic){
  const data=meshField(buildField(bodyPrims,{cell:.033,floor:0,tau:.004}));
  const geo=new T.BufferGeometry();for(const [key,values] of [['position',data.positions],['normal',data.normals],['color',data.colors]])geo.setAttribute(key,new T.BufferAttribute(values,3));geo.setIndex(new T.BufferAttribute(data.indices,1));
  const body=add(geo,[0,0,0],'#ffffff','Continuous mascot body');body.material.vertexColors=true;body.material.roughness=.76;
 }
 group.scale.setScalar(p.height/5.2);group.userData.characterHeight=headY+H*.6+(style===3?p.ears:0);
}
