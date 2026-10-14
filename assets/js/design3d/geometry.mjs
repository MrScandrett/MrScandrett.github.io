// Editable starter geometry. These are technique exercises, not full CAD/mesh authoring software.
export function buildDesign(THREE, state, texture) {
 const p=state.params, mode=state.mode, group=new THREE.Group();
 const mat=(color=state.color)=>new THREE.MeshStandardMaterial({color,roughness:p.roughness??.55,metalness:p.metalness??0});
 const mesh=(geo,x=0,y=0,z=0,color)=>{const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);group.add(m);return m;};
 const box=(w,h,d,x=0,y=h/2,z=0,color)=>mesh(new THREE.BoxGeometry(w,h,d),x,y,z,color);
 const checker=()=>{const material=mat();material.map=texture;return material;};
 if(state.imported?.length&&['materials','composite','uv'].includes(mode)){
  for(const item of state.imported){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(item.positions,3));if(item.uv.length)geo.setAttribute('uv',new THREE.Float32BufferAttribute(item.uv,2));geo.computeVertexNormals();const m=mesh(geo);if(mode==='uv')m.material=checker();}
 } else if(['navigate','transform'].includes(mode)) {
  const m=box(p.width,p.height,p.depth,p.x||0,p.height/2,p.z||0);m.rotation.y=(p.angle||0)*Math.PI/180;
 } else if(mode==='boolean') {
  // Exact axis-aligned through-cut: partition the solid by cutter boundaries.
  if(!state.cut)box(p.width,p.height,.4);
  else {
   const clip=(v,min,max)=>Math.max(min,Math.min(max,v));
   const xs=[-p.width/2,clip(p.cutX-p.opening/2,-p.width/2,p.width/2),clip(p.cutX+p.opening/2,-p.width/2,p.width/2),p.width/2];
   const ys=[0,clip(p.height/2-p.openingHeight/2,0,p.height),clip(p.height/2+p.openingHeight/2,0,p.height),p.height];
   for(let x=0;x<3;x++)for(let y=0;y<3;y++){if(x===1&&y===1)continue;const w=xs[x+1]-xs[x],h=ys[y+1]-ys[y];if(w>1e-6&&h>1e-6)box(w,h,.4,(xs[x]+xs[x+1])/2,(ys[y]+ys[y+1])/2);}
  }
 } else if(mode==='furniture'){
  box(p.width,.2,p.depth,0,p.height);box(p.width,p.back,.18,0,p.height+p.back/2,-p.depth/2+.09);
  for(const x of [-1,1])for(const z of [-1,1])box(p.leg,p.height,p.leg,x*(p.width-p.leg)/2,p.height/2,z*(p.depth-p.leg)/2);
 } else if(mode==='modular'){
  for(let x=0;x<p.columns;x++)for(let z=0;z<p.rows;z++)box(p.module,.12,p.module,(x-(p.columns-1)/2)*p.module,.06,(z-(p.rows-1)/2)*p.module,(x+z)%2?state.secondary:state.color);
  for(let x=0;x<p.columns;x++)box(p.module,p.height,.15,(x-(p.columns-1)/2)*p.module+p.offset,p.height/2,-p.rows*p.module/2+.075);
 } else if(mode==='character'){
  const base=p.leg,w=p.width/2,h=p.height,armY=h*.75,armHalf=.15;
  // Extrude one symmetric 2D silhouette into a polygon solid, including both arms.
  const points=[[-w,0],[w,0],[w,armY-armHalf],[w+p.arm,armY-armHalf],[w+p.arm,armY+armHalf],[w,armY+armHalf],[w,h],[-w,h],[-w,armY+armHalf],[-w-p.arm,armY+armHalf],[-w-p.arm,armY-armHalf],[-w,armY-armHalf]];
  const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.6,bevelEnabled:false});geo.translate(0,base,-.3);mesh(geo);
  box(p.head,p.head,p.head,0,base+p.height+p.head/2);
  for(const side of [-1,1])box(p.width*.3,p.leg,.45,side*p.width*.28,p.leg/2);
 } else if(mode==='sculpt'){
  const geo=new THREE.PlaneGeometry(4,4,48,48);geo.rotateX(-Math.PI/2);const positions=geo.attributes.position;
  for(let i=0;i<positions.count;i++)positions.setY(i,.45+.18*Math.cos(positions.getX(i))*Math.cos(positions.getZ(i)));
  for(const stroke of state.strokes){const old=Array.from({length:positions.count},(_,i)=>positions.getY(i));for(let i=0;i<positions.count;i++){const d=Math.hypot(positions.getX(i)-stroke.x,positions.getZ(i)-stroke.z)/stroke.radius;if(d>=1)continue;const fall=(1-d)**2;let y=old[i];if(stroke.type==='smooth'){const row=Math.floor(i/49),col=i%49;const neighbors=[col>0?i-1:i,col<48?i+1:i,row>0?i-49:i,row<48?i+49:i];y+=((neighbors.reduce((sum,j)=>sum+old[j],0)/4)-y)*fall*.8;}else y+=(stroke.type==='lower'?-1:1)*stroke.strength*fall;positions.setY(i,y);}}
  geo.computeVertexNormals();const m=mesh(geo);m.material.side=THREE.DoubleSide;
 } else if(mode==='props'){
  const shape=new THREE.Shape();const w=p.width/2,h=p.height/2;shape.moveTo(-w,-h);shape.lineTo(w,-h);shape.lineTo(w,h);shape.lineTo(-w,h);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.5,bevelEnabled:p.bevel>0,bevelSize:p.bevel,bevelThickness:p.bevel,bevelSegments:3,steps:1});geo.translate(0,0,-.25);mesh(geo,0,p.handle+p.height/2);box(.25,p.handle,.3,0,p.handle/2,0,state.secondary);
 } else if(mode==='procedural'){
  for(let i=0;i<p.count;i++){const h=p.height*(1+p.variation*Math.sin(i*1.4));box(.3,h,.6,(i-(p.count-1)/2)*p.spacing,h/2,0,i%2?state.secondary:state.color);}
 } else if(['materials','composite','texture','uv'].includes(mode)){
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
