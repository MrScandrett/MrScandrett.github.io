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
  const d=p.depth||.4;
  // Exact axis-aligned through-cut: partition the solid by cutter boundaries.
  if(!state.cut)box(p.width,p.height,d);
  else {
   const clip=(v,min,max)=>Math.max(min,Math.min(max,v));
   const xs=[-p.width/2,clip(p.cutX-p.opening/2,-p.width/2,p.width/2),clip(p.cutX+p.opening/2,-p.width/2,p.width/2),p.width/2];
   const ys=[0,clip(p.height/2-p.openingHeight/2,0,p.height),clip(p.height/2+p.openingHeight/2,0,p.height),p.height];
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
  for(let x=0;x<p.columns;x++)for(let z=0;z<p.rows;z++)box(p.module,.12,p.module,(x-(p.columns-1)/2)*p.module,.06,(z-(p.rows-1)/2)*p.module,(x+z)%2?state.secondary:state.color);
  for(let x=0;x<p.columns;x++)box(p.module,p.height,.15,(x-(p.columns-1)/2)*p.module+p.offset,p.height/2,-p.rows*p.module/2+.075);
 } else if(mode==='character'){
  // The humanoid template: one smooth, closed body (see humanoid.mjs / body-field.mjs) plus eyes, brows and mouth laid on it.
  const paint=hex=>{const c=new THREE.Color(hex);return [c.r,c.g,c.b];};
  const shade=(hex,k)=>'#'+new THREE.Color(hex).multiplyScalar(k).getHexString();
  const colors={skin:state.color,cloth:state.secondary,trousers:'#34383b',leather:'#49362d',hair:'#2e231d',lip:'#'+new THREE.Color(state.color).lerp(new THREE.Color('#a03a44'),.55).multiplyScalar(.9).getHexString(),gold:'#c9a24a',metal:'#8d98a3',collar:shade(state.secondary,.78)};
  // The body and head are meshed separately and remembered, so dragging a body slider doesn't re-sculpt the face (or vice versa).
  const layout=humanoidLayout(p),parts=humanoidPrims(p,paint,colors),FACE=['jaw','eyes','brows','nose','mouth'],HEAD=['head','leg','torso','jaw','eyes','brows','nose','mouth','hair','hairStyle'];
  const bodyKey=JSON.stringify([Object.entries(p).filter(([k])=>!FACE.includes(k)),colors.skin,colors.cloth]);
  const headKey=JSON.stringify([HEAD.map(k=>p[k]),colors.skin,colors.lip]);
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
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(features.mouth.map(v=>new THREE.Vector3(...v))),24,.0075*layout.H,8,false),0,0,0,shade(state.color,.4));
  group.scale.setScalar(p.height/5.2);
  group.userData.characterHeight=layout.headY+layout.H*(Math.round(p.hairStyle)===4&&p.hair>0?.95:.58);
 } else if(mode==='sculpt'){
  const geo=new THREE.PlaneGeometry(4,4,48,48);geo.rotateX(-Math.PI/2);const positions=geo.attributes.position;
  for(let i=0;i<positions.count;i++)positions.setY(i,.45+.18*Math.cos(positions.getX(i))*Math.cos(positions.getZ(i)));
  for(const stroke of state.strokes){const old=Array.from({length:positions.count},(_,i)=>positions.getY(i));for(let i=0;i<positions.count;i++){const d=Math.hypot(positions.getX(i)-stroke.x,positions.getZ(i)-stroke.z)/stroke.radius;if(d>=1)continue;const fall=(1-d)**2;let y=old[i];if(stroke.type==='smooth'){const row=Math.floor(i/49),col=i%49;const neighbors=[col>0?i-1:i,col<48?i+1:i,row>0?i-49:i,row<48?i+49:i];y+=((neighbors.reduce((sum,j)=>sum+old[j],0)/4)-y)*fall*.8;}else y+=(stroke.type==='lower'?-1:1)*stroke.strength*fall;positions.setY(i,y);}}
  geo.computeVertexNormals();const m=mesh(geo);m.material.side=THREE.DoubleSide;
 } else if(mode==='props'){
  const shape=new THREE.Shape();const w=p.width/2,h=p.height/2;shape.moveTo(-w,-h);shape.lineTo(w,-h);shape.lineTo(w,h);shape.lineTo(-w,h);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.5,bevelEnabled:p.bevel>0,bevelSize:p.bevel,bevelThickness:p.bevel,bevelSegments:3,steps:1});geo.translate(0,0,-.25);mesh(geo,0,p.handle+p.height/2);box(.25,p.handle,.3,0,p.handle/2,0,state.secondary);
 } else if(mode==='procedural'){
  for(let i=0;i<p.count;i++){const h=p.height*(1+p.variation*Math.sin(i*1.4));box(.3,h,.6,(i-(p.count-1)/2)*p.spacing,h/2,0,i%2?state.secondary:state.color);}
 } else if(mode==='materials'){
  // A curved surface reveals highlight width; a bevel reveals edge response;
  // the small wedge makes the direction of the key light legible.
  const sphere=mesh(new THREE.SphereGeometry(1,40,28),-.9,1.08,0);
  const bevelShape=new THREE.Shape(),w=.72,h=.72,r=.18;bevelShape.moveTo(-w+r,-h);bevelShape.lineTo(w-r,-h);bevelShape.quadraticCurveTo(w,-h,w,-h+r);bevelShape.lineTo(w,h-r);bevelShape.quadraticCurveTo(w,h,w-r,h);bevelShape.lineTo(-w+r,h);bevelShape.quadraticCurveTo(-w,h,-w,h-r);bevelShape.lineTo(-w,-h+r);bevelShape.quadraticCurveTo(-w,-h,-w+r,-h);bevelShape.closePath();
  const bevelGeo=new THREE.ExtrudeGeometry(bevelShape,{depth:1.15,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:4});bevelGeo.translate(0,0,-.575);mesh(bevelGeo,.95,.82,0);
  const wedgeGeo=new THREE.ConeGeometry(.42,.9,3);const wedge=mesh(wedgeGeo,0,.45,-1.55,state.secondary);wedge.rotation.y=Math.PI/6;
  const floor=mesh(new THREE.CylinderGeometry(2.55,2.7,.12,64),0,.06,0,'#33414a');floor.material.roughness=.86;floor.material.metalness=.08;
  sphere.name='Curved highlight';group.children.at(-3).name='Beveled edge';wedge.name='Light-direction marker';
 } else if(['composite','texture','uv'].includes(mode)){
  const m=box(2,2,2);if(['texture','uv'].includes(mode))m.material=checker();
 } else if(['rig','animation'].includes(mode)){
  const joint=p.joint??1.5,blend=p.blend??.6,geo=new THREE.CylinderGeometry(.45,.45,3,16,24);geo.translate(0,1.5,0);
  const idx=[],weights=[];for(let i=0;i<geo.attributes.position.count;i++){const y=geo.attributes.position.getY(i),w=Math.max(0,Math.min(1,(y-joint)/blend+.5));idx.push(0,1,0,0);weights.push(1-w,w,0,0);}
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(idx,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  const root=new THREE.Bone(),child=new THREE.Bone();root.add(child);child.position.y=joint;
  const m=new THREE.SkinnedMesh(geo,mat());m.add(root);m.bind(new THREE.Skeleton([root,child]));child.rotation.z=(p.angle||0)*Math.PI/180;group.add(m);group.add(new THREE.SkeletonHelper(m));group.userData.joint=child;
 } else if(mode==='print'){
  const bracket=new THREE.Group();group.add(bracket);
  const shape=new THREE.Shape();[[-7.5,0],[7.5,0],[7.5,4],[-3.5,4],[-3.5,p.height],[-7.5,p.height]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:p.width,bevelEnabled:false});geo.translate(0,0,-p.width/2);geo.rotateY(Math.PI/2);const solid=mesh(geo);bracket.add(solid);bracket.rotation.x=p.angle*Math.PI/180;
  bracket.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(bracket);bracket.position.y-=bounds.min.y;
 } else if(mode==='clearance'){
  const axle=mesh(new THREE.CylinderGeometry(p.radius,p.radius,p.height,48),0,p.height/2,0,state.secondary);
  const shape=new THREE.Shape();shape.absarc(0,0,p.radius+p.gap+3,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,p.radius+p.gap,0,Math.PI*2,true);shape.holes.push(hole);const geo=new THREE.ExtrudeGeometry(shape,{depth:p.height,bevelEnabled:false,curveSegments:48});geo.rotateX(-Math.PI/2);mesh(geo);
  axle.name='Axle';group.children.at(-1).name='Ring';
 }
 if(mode==='uv')group.traverse(m=>{if(!m.isMesh)return;const uv=m.geometry.attributes.uv;if(uv){for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*p.uScale+p.uOffset,uv.getY(i)*p.vScale+p.vOffset);uv.needsUpdate=true;}});
 return group;
}
export function disposeDesign(group){group.traverse(m=>{m.geometry?.dispose();if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();});}
export function snapshotDesign(THREE,group){
 group.updateMatrixWorld(true);const out=[];
 group.traverse(m=>{if(!m.isMesh)return;const geo=m.geometry,positions=[],uvs=[],point=new THREE.Vector3();const index=geo.index;const n=index?index.count:geo.attributes.position.count;
 for(let i=0;i<n;i++){const v=index?index.getX(i):i;if(m.isSkinnedMesh){m.skeleton.update();m.getVertexPosition(v,point);}else point.fromBufferAttribute(geo.attributes.position,v);point.applyMatrix4(m.matrixWorld);positions.push(point.x,point.y,point.z);if(geo.attributes.uv)uvs.push(geo.attributes.uv.getX(v),geo.attributes.uv.getY(v));}
 out.push({positions,uv:uvs,color:'#'+m.material.color.getHexString()});});return out;
}
export function toObj(snapshot){let vertex=1,tex=1;const lines=['# 3D Design workshop — static geometry; units are stated in the workshop'];
 snapshot.forEach((m,index)=>{lines.push('o Part_'+(index+1));for(let i=0;i<m.positions.length;i+=3)lines.push('v '+m.positions.slice(i,i+3).map(x=>x.toFixed(6)).join(' '));for(let i=0;i<m.uv.length;i+=2)lines.push('vt '+m.uv.slice(i,i+2).map(x=>x.toFixed(6)).join(' '));for(let i=0;i<m.positions.length/3;i+=3){const face=[0,1,2].map(j=>m.uv.length?`${vertex+i+j}/${tex+i+j}`:`${vertex+i+j}`);lines.push('f '+face.join(' '));}vertex+=m.positions.length/3;tex+=m.uv.length/2;});return lines.join('\n')+'\n';
}

// STL convention for these millimeter exercises: Y-up scene -> Z-up print bed.
export function toPrintSpace(snapshot){const values=[];for(const mesh of snapshot)for(let i=0;i<mesh.positions.length;i+=3)values.push(mesh.positions[i],-mesh.positions[i+2],mesh.positions[i+1]);return new Float32Array(values);}
