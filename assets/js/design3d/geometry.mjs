import { sculptGeometry } from './sculpt-surface.mjs';
import { makeInstances } from './procedural.mjs';
import { addHeroEquipment } from './hero-detail.mjs';
import { buildStyledCharacter } from './character-styles.mjs';
import { createDynamicHair } from './hair-physics.mjs';
import { humanoidLayout, humanoidPrims, bodyField, headField, facialFeatures } from './humanoid.mjs';
import { meshField } from './body-field.mjs';
const memo={};
const remember=(slot,key,make)=>{if(memo[slot]?.key!==key)memo[slot]={key,value:make()};return memo[slot].value;};
// Editable starter geometry. These are technique exercises, not full CAD/mesh authoring software.
export function buildDesign(THREE, state, texture) {
 const p=state.params, mode=state.mode, group=new THREE.Group();
 const mat=(color=state.color)=>new THREE.MeshStandardMaterial({color,roughness:p.roughness??.55,metalness:p.metalness??0});
 const mesh=(geo,x=0,y=0,z=0,color)=>{const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);group.add(m);return m;};
 const box=(w,h,d,x=0,y=h/2,z=0,color)=>mesh(new THREE.BoxGeometry(w,h,d),x,y,z,color);
 const checker=()=>{const material=mat();material.map=texture;return material;};
 if(state.imported?.length&&['materials','composite','uv'].includes(mode)){
  for(const item of state.imported){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(item.positions,3));if(item.uv.length)geo.setAttribute('uv',new THREE.Float32BufferAttribute(item.uv,2));geo.computeVertexNormals();const m=mesh(geo);if(mode==='uv')m.material=checker();}
 } else if(mode==='navigate') {
  // Asymmetrical fabrication bracket with distinct front/back/top silhouettes.
  box(p.width, p.height*.7, p.depth, 0, p.height*.35, 0);
  box(p.width, p.height*.3, p.depth*.45, 0, p.height*.7 + p.height*.15, -p.depth*.275);
  box(p.width*.6, p.height*.2, p.depth*.25, 0, p.height*.1, p.depth*.5 + p.depth*.125, state.secondary);
  box(p.width*.15, p.height*.35, p.depth*.1, 0, p.height*.175, p.depth*.5 + p.depth*.25 + p.depth*.05, state.secondary);
 } else if(mode==='transform') {
  box(8, .06, 8, 0, -.03, 0, state.secondary);
  const m=box(p.width,p.height,p.depth,p.x||0,p.height/2,p.z||0);m.rotation.y=(p.angle||0)*Math.PI/180;
 } else if(mode==='boolean') {
  const d=p.depth||.4, cy=p.height/2+(p.cutY||0), op=Math.round(p.operation||0);
  // Exact axis-aligned Boolean operations plus live translucent cutter preview before Apply.
  if(!state.cut){
   box(p.width,p.height,d);
   const previewGeo=new THREE.BoxGeometry(p.opening,p.openingHeight,d*1.4);
   const previewMat=new THREE.MeshBasicMaterial({color:'#38bdf8',transparent:true,opacity:.28,depthWrite:false});
   const previewMesh=new THREE.Mesh(previewGeo,previewMat);
   previewMesh.position.set(p.cutX,cy,0);
   previewMesh.userData.preview=true;
   const wire=new THREE.LineSegments(new THREE.EdgesGeometry(previewGeo),new THREE.LineBasicMaterial({color:'#7dd3fc'}));
   wire.userData.preview=true;
   previewMesh.add(wire);
   group.add(previewMesh);
  } else if(op===1) {
   box(p.width,p.height,d);
   box(p.opening,p.openingHeight,d*1.6,p.cutX,cy,0,state.secondary);
  } else if(op===2) {
   const x0=Math.max(-p.width/2,p.cutX-p.opening/2),x1=Math.min(p.width/2,p.cutX+p.opening/2);
   const y0=Math.max(0,cy-p.openingHeight/2),y1=Math.min(p.height,cy+p.openingHeight/2);
   if(x1>x0+1e-5&&y1>y0+1e-5)box(x1-x0,y1-y0,d,(x0+x1)/2,(y0+y1)/2);
   else box(.05,.05,.05,p.cutX,cy);
  } else {
   const clip=(v,min,max)=>Math.max(min,Math.min(max,v));
   const xs=[-p.width/2,clip(p.cutX-p.opening/2,-p.width/2,p.width/2),clip(p.cutX+p.opening/2,-p.width/2,p.width/2),p.width/2];
   const ys=[0,clip(cy-p.openingHeight/2,0,p.height),clip(cy+p.openingHeight/2,0,p.height),p.height];
   for(let x=0;x<3;x++)for(let y=0;y<3;y++){if(x===1&&y===1)continue;const w=xs[x+1]-xs[x],h=ys[y+1]-ys[y];if(w>1e-6&&h>1e-6)box(w,h,d,(xs[x]+xs[x+1])/2,(ys[y]+ys[y+1])/2);}
  }
 } else if(mode==='furniture'){
  const style=Math.round(p.style||0), backStyle=Math.round(p.backStyle||0), loft=p.cushion||0, splay=p.splay||0;
  const add=(geo,x,y,z,color=state.color,rx=0,ry=0,rz=0)=>{const m=mesh(geo,x,y,z,color);m.rotation.set(rx,ry,rz);return m;};
  const roundedBox=(w,h,d,x,y,z,color=state.color,r=.08)=>{const shape=new THREE.Shape();const hw=w/2,hh=h/2,rr=Math.min(r,hw,hh);shape.moveTo(-hw+rr,-hh);shape.lineTo(hw-rr,-hh);shape.quadraticCurveTo(hw,-hh,hw,-hh+rr);shape.lineTo(hw,hh-rr);shape.quadraticCurveTo(hw,hh,hw-rr,hh);shape.lineTo(-hw+rr,hh);shape.quadraticCurveTo(-hw,hh,-hw,hh-rr);shape.lineTo(-hw,-hh+rr);shape.quadraticCurveTo(-hw,-hh,-hw+rr,-hh);const g=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:Math.min(.035,r/2),bevelThickness:.025,bevelSegments:2});g.translate(0,0,-d/2);return add(g,x,y,z,color);};
  const seatY=p.height, seatThickness=style===2?.14:.2;
  if(style===3){ // sculptural pedestal stool
   add(new THREE.CylinderGeometry(p.width*.42,p.width*.32,seatThickness,32),0,seatY,0);
   add(new THREE.CylinderGeometry(p.leg*.7,p.leg*1.45,p.height,24),0,p.height/2,0,state.secondary);
   add(new THREE.CylinderGeometry(p.width*.34,p.width*.46,.12,32),0,.06,0,state.secondary);
  }else{
   roundedBox(p.width,seatThickness,p.depth,0,seatY,0,state.color,style===4?.2:.08);
   const legCount=style===5?6:4;
   const xs=style===5?[-1,0,1]:[-1,1];
   for(const x of xs)for(const z of [-1,1]){const lx=x*(p.width-p.leg)/2,lz=z*(p.depth-p.leg)/2;const leg=box(p.leg,p.height,p.leg,lx,p.height/2,lz,state.secondary);leg.rotation.z=-x*splay;leg.rotation.x=z*splay;}
   if(legCount===4&&style===1){box(p.width-p.leg,.11,.11,0,p.height*.38,(p.depth-p.leg)/2,state.secondary);box(p.width-p.leg,.11,.11,0,p.height*.38,-(p.depth-p.leg)/2,state.secondary);}
  }
  if(loft>0)roundedBox(p.width*.9,loft+.07,p.depth*.82,0,seatY+seatThickness/2+(loft+.07)/2,style===4?.08:0,state.secondary,.12);
  if(p.back>0&&![2,3].includes(style)){
   const backY=seatY+p.back/2, backZ=-p.depth/2+.09;
   if(backStyle===1){for(let i=-2;i<=2;i++)box(Math.max(.06,p.leg*.55),p.back,.12,i*p.width*.19,backY,backZ,state.secondary);}
   else if(backStyle===2){roundedBox(p.width*.92,p.back*.48,.16,0,seatY+p.back*.68,backZ,state.secondary,.18);box(p.leg,p.back*.62,p.leg,-p.width*.42,seatY+p.back*.31,backZ,state.secondary);box(p.leg,p.back*.62,p.leg,p.width*.42,seatY+p.back*.31,backZ,state.secondary);}
   else if(backStyle===3){const back=roundedBox(p.width,p.back,.18,0,backY,backZ,state.secondary,.16);back.rotation.x=-.16;}
   else roundedBox(p.width,p.back,.18,0,backY,backZ,state.secondary,.08);
  }
  if(p.arms>=.5&&![2,3].includes(style))for(const side of [-1,1]){box(p.leg,p.back*.48,p.leg,side*(p.width-p.leg)/2,seatY+p.back*.24,0,state.secondary);roundedBox(p.leg,p.leg,p.depth*.82,side*(p.width-p.leg)/2,seatY+p.back*.48,0,state.secondary,.06);}
 } else if(mode==='modular'){
  const m=p.module, cols=p.columns, rows=p.rows, h=p.height, walls=Math.round(p.walls||0), doorway=Math.round(p.doorway||0);
  for(let x=0;x<cols;x++)for(let z=0;z<rows;z++)box(m,.12,m,(x-(cols-1)/2)*m,.06,(z-(rows-1)/2)*m,(x+z)%2?state.secondary:state.color);
  const doorCol=Math.floor(cols/2), backZ=-rows*m/2+.075;
  for(let x=0;x<cols;x++){
   const cx=(x-(cols-1)/2)*m+p.offset;
   if(doorway===1&&x===doorCol){
    const jamb=m*.26, lintelH=h*.28;
    box(jamb,h,.15,cx-m/2+jamb/2,h/2,backZ);
    box(jamb,h,.15,cx+m/2-jamb/2,h/2,backZ);
    box(m-jamb*2,lintelH,.15,cx,h-lintelH/2,backZ);
   } else box(m,h,.15,cx,h/2,backZ);
  }
  if(walls>=1){
   const leftX=-cols*m/2+.075;
   for(let z=0;z<rows;z++)box(.15,h,m,leftX,h/2,(z-(rows-1)/2)*m+p.offset);
  }
  if(walls>=2){
   const rightX=cols*m/2-.075;
   for(let z=0;z<rows;z++)box(.15,h,m,rightX,h/2,(z-(rows-1)/2)*m+p.offset);
  }
 } else if(mode==='character' && p.artStyle>0 && p.artStyle<4){
  buildStyledCharacter(THREE,group,p,state);
 } else if(mode==='character'){
  // The humanoid template: one smooth, closed body (see humanoid.mjs / body-field.mjs) plus eyes, brows and mouth laid on it.
  const paint=hex=>{const c=new THREE.Color(hex);return [c.r,c.g,c.b];};
  const shade=(hex,k)=>'#'+new THREE.Color(hex).multiplyScalar(k).getHexString();
  const colors={skin:state.color,cloth:state.secondary,trousers:'#34383b',leather:'#49362d',hair:'#2e231d',gold:'#c9a24a',metal:'#8d98a3',collar:shade(state.secondary,.78)};
  // The body and head are meshed separately and remembered, so dragging a body slider doesn't re-sculpt the face (or vice versa).
  const layout=humanoidLayout(p),parts=humanoidPrims(p.hairPhysics?{...p,hair:0}:p,paint,colors),FACE=['jaw','eyes','brows','nose','mouth'],HEAD=['head','leg','torso','jaw','eyes','brows','nose','mouth','hair','hairStyle','hairPhysics'];
  const bodyKey=JSON.stringify([Object.entries(p).filter(([k])=>!FACE.includes(k)&&!['hairStiffness','hairDamping','hairWind'].includes(k)),colors.skin,colors.cloth]);
  const headKey=JSON.stringify([HEAD.map(k=>p[k]),colors.skin]);
  const bodyData=remember('body',bodyKey,()=>meshField(bodyField(parts,layout)));
  const headData=remember('head',headKey,()=>{const field=headField(parts,layout);return {mesh:meshField(field),features:facialFeatures(field,p,layout)};});
  const features=headData.features;
  const solid=(m,name)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(m.positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(m.normals,3));geo.setAttribute('color',new THREE.BufferAttribute(m.colors,3));geo.setIndex(new THREE.BufferAttribute(m.indices,1));const mm=mesh(geo,0,0,0,'#ffffff');mm.material.vertexColors=true;mm.name=name;return mm;};
  solid(bodyData,'Humanoid template');solid(headData.mesh,'Head');
  const ball=(r,[x,y,z],color,seg=28,sy=1,sz=1)=>{const m=mesh(new THREE.SphereGeometry(r,seg,Math.round(seg*.6)),x,y,z,color);m.scale.set(1,sy,sz);return m;};
  for(const e of features.eyes){
   ball(e.r,e.c,'#f4efe6',32);
   // iris and pupil sit on the front of the eyeball, slightly turned toward the nose
   const ix=e.c[0]-e.side*e.r*.08,iz=e.c[2]+e.r*.78;
   ball(e.r*.52,[ix,e.c[1],iz],'#3a2a20',28,1,.55);ball(e.r*.26,[ix,e.c[1],iz+e.r*.1],'#0b0907',20,1,.5);
   ball(e.r*.13,[ix-e.r*.16,e.c[1]+e.r*.2,iz+e.r*.22],'#ffffff',10);
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(features.mouth.map(v=>new THREE.Vector3(...v))),24,.0045*layout.H,8,false),0,0,0,shade(state.color,.65));
  if(p.hairPhysics&&p.hair>0)group.userData.hairSimulation=createDynamicHair(THREE,group,layout,p,colors.hair);
  if(p.artStyle===4)addHeroEquipment(THREE,group,p,layout,state.secondary);
  group.scale.setScalar(p.height/5.2);
  group.userData.characterHeight=layout.headY+layout.H*(Math.round(p.hairStyle)===4&&p.hair>0?.95:.58);
 } else if(mode==='sculpt'){
  const surface=mesh(sculptGeometry(THREE,state));
  surface.material.side=THREE.DoubleSide;
 } else if(mode==='props'){
  const form=Math.round(p.form||0), segs=Math.max(1,Math.round(p.bevelSegs||3)), flat=Math.round(p.flat||0)===1;
  const extrudeOpts=(depth=.5)=>({depth,bevelEnabled:p.bevel>0,bevelSize:p.bevel,bevelThickness:p.bevel,bevelSegments:segs,steps:1});
  const propMesh=(geo,x=0,y=0,z=0,color)=>{const m=mesh(geo,x,y,z,color);m.material.flatShading=flat;return m;};
  const propBox=(w,h,d,x=0,y=h/2,z=0,color)=>propMesh(new THREE.BoxGeometry(w,h,d),x,y,z,color);
  if(form===1){ // Wrench
   const r=Math.max(.35,p.width*.28), s=new THREE.Shape();
   s.absarc(0,0,r,.55,Math.PI*2-.55,false);
   s.lineTo(r*.35,-r*.32);s.lineTo(r*.35,r*.32);s.closePath();
   const head=new THREE.ExtrudeGeometry(s,extrudeOpts(.32));head.translate(0,0,-.16);
   propMesh(head,0,p.handle+r*.75);
   const hShape=new THREE.Shape(), hw=Math.max(.14,p.height*.18), hh=p.handle/2;
   hShape.moveTo(-hw,-hh);hShape.lineTo(hw,-hh);hShape.lineTo(hw,hh);hShape.lineTo(-hw,hh);hShape.closePath();
   const handle=new THREE.ExtrudeGeometry(hShape,extrudeOpts(.22));handle.translate(0,0,-.11);
   propMesh(handle,0,p.handle/2,0,state.secondary);
  } else if(form===2){ // Shield / Sign
   const w=p.width/2, h=p.height, s=new THREE.Shape();
   s.moveTo(-w,h*.55);s.lineTo(w,h*.55);s.lineTo(w*.92,-h*.15);s.lineTo(0,-h*.65);s.lineTo(-w*.92,-h*.15);s.closePath();
   const geo=new THREE.ExtrudeGeometry(s,extrudeOpts(.32));geo.translate(0,0,-.16);
   propMesh(geo,0,p.handle+h*.65);
   propBox(.26,p.handle,.24,0,p.handle/2,-.05,state.secondary);
  } else if(form===3){ // Supply Crate
   const w=p.width/2, h=p.height, s=new THREE.Shape();
   s.moveTo(-w,-h/2);s.lineTo(w,-h/2);s.lineTo(w,h/2);s.lineTo(-w,h/2);s.closePath();
   const hole=new THREE.Path(), iw=w*.72, ih=h*.34;
   hole.moveTo(-iw,-ih);hole.lineTo(iw,-ih);hole.lineTo(iw,ih);hole.lineTo(-iw,ih);hole.closePath();
   s.holes.push(hole);
   const rim=new THREE.ExtrudeGeometry(s,extrudeOpts(p.handle*.55));rim.translate(0,0,-p.handle*.275);
   propMesh(rim,0,h/2+p.bevel);
   propBox(w*1.65,h*.82,p.handle*.42,0,h/2+p.bevel,0,state.secondary);
  } else if(form===4){ // Desk Caddy
   const w=p.width/2, d=Math.max(.8,p.handle*.55), h=p.height*.95;
   const base=new THREE.Shape();base.moveTo(-w,-d/2);base.lineTo(w,-d/2);base.lineTo(w,d/2);base.lineTo(-w,d/2);base.closePath();
   const baseGeo=new THREE.ExtrudeGeometry(base,extrudeOpts(.24));baseGeo.rotateX(-Math.PI/2);
   propMesh(baseGeo,0,.12,0,state.secondary);
   const cup=new THREE.Shape(), cw=Math.min(w*.65,d*.42);
   cup.moveTo(-cw,-cw);cup.lineTo(cw,-cw);cup.lineTo(cw,cw);cup.lineTo(-cw,cw);cup.closePath();
   const hole=new THREE.Path(), hw=cw*.65;
   hole.moveTo(-hw,-hw);hole.lineTo(hw,-hw);hole.lineTo(hw,hw);hole.lineTo(-hw,hw);hole.closePath();
   cup.holes.push(hole);
   const cupGeo=new THREE.ExtrudeGeometry(cup,extrudeOpts(h));cupGeo.rotateX(-Math.PI/2);
   propMesh(cupGeo,0,.24,0);
  } else { // Mallet / Hammer
   const shape=new THREE.Shape();const w=p.width/2,h=p.height/2;shape.moveTo(-w,-h);shape.lineTo(w,-h);shape.lineTo(w,h);shape.lineTo(-w,h);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,extrudeOpts(.5));geo.translate(0,0,-.25);propMesh(geo,0,p.handle+p.height/2);propBox(.25,p.handle,.3,0,p.handle/2,0,state.secondary);
  }
 } else if(mode==='procedural'){
  const source = state.imported?.[0];
  let geometry;
  if (p.shape === 3 && source) {
   geometry = new THREE.BufferGeometry();
   geometry.setAttribute('position', new THREE.Float32BufferAttribute(source.positions, 3));
   geometry.computeVertexNormals();
  } else {
   if (p.shape === 2) geometry = new THREE.ConeGeometry(.5, 1, 16);
   else if (p.shape === 1) geometry = new THREE.CylinderGeometry(.5, .5, 1, 16);
   else geometry = new THREE.BoxGeometry(1, 1, 2);
   geometry.translate(0, .5, 0);
  }
  const colors = [mat(state.color), mat(state.secondary)];
  for (const [i, item] of makeInstances(p).entries()) {
   const instance = new THREE.Mesh(geometry, colors[i % 2]);
   instance.name = 'Copy ' + (i + 1);
   instance.position.set(item.x, 0, item.z);
   instance.rotation.y = item.yaw;
   instance.scale.set(p.width, item.height, p.width);
   group.add(instance);
  }
 } else if(mode==='materials'){
  // A curved surface reveals highlight width; a bevel reveals edge response;
  // the small wedge makes the direction of the key light legible.
  const sphere=mesh(new THREE.SphereGeometry(1,40,28),-.9,1.08,0);
  const bevelShape=new THREE.Shape(),w=.72,h=.72,r=.18;bevelShape.moveTo(-w+r,-h);bevelShape.lineTo(w-r,-h);bevelShape.quadraticCurveTo(w,-h,w,-h+r);bevelShape.lineTo(w,h-r);bevelShape.quadraticCurveTo(w,h,w-r,h);bevelShape.lineTo(-w+r,h);bevelShape.quadraticCurveTo(-w,h,-w,h-r);bevelShape.lineTo(-w,-h+r);bevelShape.quadraticCurveTo(-w,-h,-w+r,-h);bevelShape.closePath();
  const bevelGeo=new THREE.ExtrudeGeometry(bevelShape,{depth:1.15,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:4});bevelGeo.translate(0,0,-.575);mesh(bevelGeo,.95,.82,0);
  const wedgeGeo=new THREE.ConeGeometry(.42,.9,3);const wedge=mesh(wedgeGeo,0,.45,-1.55,state.secondary);wedge.rotation.y=Math.PI/6;
  const floor=mesh(new THREE.CylinderGeometry(2.55,2.7,.12,64),0,.06,0,'#33414a');floor.material.roughness=.86;floor.material.metalness=.08;
  sphere.name='Curved highlight';group.children.at(-3).name='Beveled edge';wedge.name='Light-direction marker';
 } else if(mode==='composite'){
  const subj=Math.round(p.subject||0);
  const plinth=mesh(new THREE.CylinderGeometry(2.1,2.25,.14,48),0,.07,0,'#2f3944');plinth.material.roughness=.8;
  if(subj===0){ // Studio bust & plinth
   mesh(new THREE.CylinderGeometry(.68,.84,.48,36),0,.38,0,state.secondary);
   const head=mesh(new THREE.SphereGeometry(.72,36,28),0,1.42,0);head.scale.set(.92,1.12,.98);
   const ring=mesh(new THREE.TorusGeometry(.95,.09,18,48),0,1.28,0,state.secondary);ring.rotation.set(.45,.3,0);
  } else if(subj===1){ // Beveled study blocks
   const s=new THREE.Shape(), w=.68, h=.68, r=.16;
   s.moveTo(-w+r,-h);s.lineTo(w-r,-h);s.quadraticCurveTo(w,-h,w,-h+r);s.lineTo(w,h-r);s.quadraticCurveTo(w,h,w-r,h);s.lineTo(-w+r,h);s.quadraticCurveTo(-w,h,-w,h-r);s.lineTo(-w,-h+r);s.quadraticCurveTo(-w,-h,-w+r,-h);s.closePath();
   const bGeo=new THREE.ExtrudeGeometry(s,{depth:1.1,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:4});bGeo.translate(0,0,-.55);
   const block=mesh(bGeo,-.55,1.02,0);block.rotation.y=.35;
   const orb=mesh(new THREE.SphereGeometry(.62,36,24),.72,.76,.22,state.secondary);orb.material.roughness=.25;
  } else { // Arch & spheres
   const arch=new THREE.Shape();arch.moveTo(-1.3,0);arch.lineTo(-.55,0);arch.lineTo(-.55,1.1);arch.absarc(0,1.1,.55,Math.PI,0,true);arch.lineTo(.55,0);arch.lineTo(1.3,0);arch.lineTo(1.3,2.2);arch.lineTo(-1.3,2.2);arch.closePath();
   const aGeo=new THREE.ExtrudeGeometry(arch,{depth:.55,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:3});aGeo.translate(0,0,-.275);
   mesh(aGeo,0,.14,-.35);
   mesh(new THREE.SphereGeometry(.42,32,24),-.1,.56,.45,state.secondary);
   mesh(new THREE.SphereGeometry(.26,24,18),.65,.4,.65);
  }
 } else if(['texture','uv'].includes(mode)){
  const m=box(2,2,2);m.material=checker();
 } else if(['rig','animation'].includes(mode)){
  const joint=p.joint??1.5,blend=p.blend??.6,geo=new THREE.CylinderGeometry(p.radius??.45,p.radius??.45,3,16,Math.round(p.segments??24));geo.translate(0,1.5,0);
  const idx=[],weights=[],colors=[];for(let i=0;i<geo.attributes.position.count;i++){const y=geo.attributes.position.getY(i),t=Math.max(0,Math.min(1,(y-joint)/blend+.5)),w=p.smooth===1?t*t*(3-2*t):t;const c=new THREE.Color('#4f8ef0').lerp(new THREE.Color('#e15a4a'),w);colors.push(c.r,c.g,c.b);idx.push(0,1,0,0);weights.push(1-w,w,0,0);}
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(idx,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  if(p.weights===1)geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const root=new THREE.Bone(),child=new THREE.Bone();root.name='LimbRoot';child.name='BendJoint';root.add(child);child.position.y=joint;
  const material=mat();material.vertexColors=p.weights===1;const m=new THREE.SkinnedMesh(geo,material);m.name='FlexibleLimb';m.add(root);m.bind(new THREE.Skeleton([root,child]));child.rotation.z=(p.angle||0)*Math.PI/180;group.add(m);group.add(new THREE.SkeletonHelper(m));group.userData.joint=child;
 } else if(mode==='print'){
  const bracket=new THREE.Group();group.add(bracket);
  const shape=new THREE.Shape();[[-7.5,0],[7.5,0],[7.5,4],[-3.5,4],[-3.5,p.height],[-7.5,p.height]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const rawGeo=new THREE.ExtrudeGeometry(shape,{depth:p.width,bevelEnabled:false});rawGeo.translate(0,0,-p.width/2);rawGeo.rotateY(Math.PI/2);
  const geo=rawGeo.index?rawGeo.toNonIndexed():rawGeo;if(geo!==rawGeo)rawGeo.dispose();
  const pos=geo.attributes.position, colors=new Float32Array(pos.count*3);
  const rad=p.angle*Math.PI/180, quat=new THREE.Quaternion().setFromEuler(new THREE.Euler(rad,0,0));
  const tmp=new THREE.Vector3(), va=new THREE.Vector3(), vb=new THREE.Vector3(), vc=new THREE.Vector3(), ab=new THREE.Vector3(), ac=new THREE.Vector3(), nrm=new THREE.Vector3();
  let minY=Infinity;
  for(let i=0;i<pos.count;i++){tmp.fromBufferAttribute(pos,i).applyQuaternion(quat);if(tmp.y<minY)minY=tmp.y;}
  const baseCol=new THREE.Color(state.color), warnCol=new THREE.Color('#e85a4f');
  let totalArea=0, bedArea=0, overhangArea=0, overhangTris=0;
  for(let i=0;i<pos.count;i+=3){
   va.fromBufferAttribute(pos,i).applyQuaternion(quat);va.y-=minY;
   vb.fromBufferAttribute(pos,i+1).applyQuaternion(quat);vb.y-=minY;
   vc.fromBufferAttribute(pos,i+2).applyQuaternion(quat);vc.y-=minY;
   ab.subVectors(vb,va);ac.subVectors(vc,va);nrm.crossVectors(ab,ac);
   const area=nrm.length()*.5;if(area>0)nrm.divideScalar(area*2);
   totalArea+=area;
   const triMinY=Math.min(va.y,vb.y,vc.y);
   const isBed=triMinY<=0.35&&nrm.y<-0.9;
   const isOverhang=!isBed&&nrm.y<-0.7071&&triMinY>0.35;
   if(isBed)bedArea+=area;
   else if(isOverhang){overhangArea+=area;overhangTris++;}
   const c=isOverhang?warnCol:baseCol;
   for(let k=0;k<3;k++){colors[(i+k)*3]=c.r;colors[(i+k)*3+1]=c.g;colors[(i+k)*3+2]=c.b;}
  }
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const solid=mesh(geo,0,0,0,'#ffffff');solid.material.vertexColors=true;
  bracket.add(solid);bracket.rotation.x=rad;bracket.position.y-=minY;
  group.userData.printStats={bedArea:Math.round(bedArea),overhangPct:totalArea?Math.round(overhangArea/totalArea*100):0,overhangTris};
 } else if(mode==='clearance'){
  const axle=mesh(new THREE.CylinderGeometry(p.radius,p.radius,p.height,48),0,p.height/2,0,state.secondary);
  const shape=new THREE.Shape();shape.absarc(0,0,p.radius+p.gap+3,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,p.radius+p.gap,0,Math.PI*2,true);shape.holes.push(hole);const geo=new THREE.ExtrudeGeometry(shape,{depth:p.height,bevelEnabled:false,curveSegments:48});geo.rotateX(-Math.PI/2);mesh(geo);
  axle.name='Axle';group.children.at(-1).name='Ring';
 }
 if(mode==='uv')group.traverse(m=>{if(!m.isMesh)return;const uv=m.geometry.attributes.uv;if(uv){for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*p.uScale+p.uOffset,uv.getY(i)*p.vScale+p.vOffset);uv.needsUpdate=true;}});
 return group;
}
export function disposeDesign(group){
 const resources=new Set();
 group.traverse(object=>{
  if(object.geometry)resources.add(object.geometry);
  if(object.material)for(const material of Array.isArray(object.material)?object.material:[object.material])resources.add(material);
 });
 for(const resource of resources)resource.dispose();
}
export function snapshotDesign(THREE,group){
 group.updateMatrixWorld(true);const out=[];
 group.traverse(m=>{if(!m.isMesh||m.userData.preview)return;const geo=m.geometry,positions=[],uvs=[],point=new THREE.Vector3();const index=geo.index;const n=index?index.count:geo.attributes.position.count;
 for(let i=0;i<n;i++){const v=index?index.getX(i):i;if(m.isSkinnedMesh){m.skeleton.update();m.getVertexPosition(v,point);}else point.fromBufferAttribute(geo.attributes.position,v);point.applyMatrix4(m.matrixWorld);positions.push(point.x,point.y,point.z);if(geo.attributes.uv)uvs.push(geo.attributes.uv.getX(v),geo.attributes.uv.getY(v));}
 out.push({positions,uv:uvs,color:'#'+m.material.color.getHexString()});});return out;
}
export function toObj(snapshot){let vertex=1,tex=1;const lines=['# 3D Design workshop — static geometry; units are stated in the workshop'];
 snapshot.forEach((m,index)=>{lines.push('o Part_'+(index+1));for(let i=0;i<m.positions.length;i+=3)lines.push('v '+m.positions.slice(i,i+3).map(x=>x.toFixed(6)).join(' '));for(let i=0;i<m.uv.length;i+=2)lines.push('vt '+m.uv.slice(i,i+2).map(x=>x.toFixed(6)).join(' '));for(let i=0;i<m.positions.length/3;i+=3){const face=[0,1,2].map(j=>m.uv.length?`${vertex+i+j}/${tex+i+j}`:`${vertex+i+j}`);lines.push('f '+face.join(' '));}vertex+=m.positions.length/3;tex+=m.uv.length/2;});return lines.join('\n')+'\n';
}

// STL convention for these millimeter exercises: Y-up scene -> Z-up print bed.
export function toPrintSpace(snapshot){const values=[];for(const mesh of snapshot)for(let i=0;i<mesh.positions.length;i+=3)values.push(mesh.positions[i],-mesh.positions[i+2],mesh.positions[i+1]);return new Float32Array(values);}
