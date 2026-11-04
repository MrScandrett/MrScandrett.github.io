// Fixed-step Verlet guide locks: pinned roots, length constraints and a skull collider.
// These are visible study locks, not a production strand groom or Blender cache.
export function createDynamicHair(THREE, group, { H, headY }, p, color) {
 const locks=[], count=28, segments=9, sides=5, step=1/120;
 const material=new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.05});
 const cap=new THREE.Mesh(new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,1.45),material);
 cap.position.set(0,headY+.13*H,-.06*H);cap.scale.set(.46*H,.49*H,.51*H);group.add(cap);
 const style=Math.round(p.hairStyle),length=(.25+p.hair*.8)*(style===0?.4:style===2?1.3:1)*H;
 for(let k=0;k<count;k++){
  const angle=.65+k/(count-1)*(Math.PI*2-1.3), root=new THREE.Vector3(Math.sin(angle)*.43*H,headY+.24*H,Math.cos(angle)*.49*H-.06*H);
  const rest=Array.from({length:segments+1},(_,j)=>{
   const t=j/segments,flare=Math.sin(t*Math.PI)*(style===4?.38:.12)*H,twist=style===3?Math.sin(t*Math.PI*5)*.035*H:0;
   return root.clone().add(new THREE.Vector3(Math.sin(angle)*flare+twist,-length*t,Math.cos(angle)*flare-(Math.round(p.hairStyle)===1?t*.08*H:0)));
  });
  const nodes=rest.map(v=>v.clone()), previous=rest.map(v=>v.clone());
  const geometry=new THREE.BufferGeometry(), positions=new Float32Array((segments+1)*sides*3),indices=[];
  for(let j=0;j<segments;j++)for(let r=0;r<sides;r++){const a=j*sides+r,b=j*sides+(r+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);}
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Dynamic hair lock';mesh.frustumCulled=false;group.add(mesh);
  locks.push({nodes,previous,rest,geometry,lengths:rest.slice(1).map((v,j)=>v.distanceTo(rest[j]))});
 }
 let accumulator=0,time=0,gust=0;
 function collide(v){
  const x=v.x/(.425*H),y=(v.y-headY-.1*H)/(.46*H),z=(v.z+.05*H)/(.49*H),d=Math.hypot(x,y,z);
  if(d<1&&d>1e-6){v.set(x/d*.425*H,headY+.1*H+y/d*.46*H,z/d*.49*H-.05*H);}
 }
 function integrate(){
  time+=step;gust*=.985;
  for(const lock of locks){const {nodes,previous,rest,lengths}=lock;
   for(let j=1;j<nodes.length;j++){
    const v=nodes[j],old=v.clone(),velocity=v.clone().sub(previous[j]).multiplyScalar(1-p.hairDamping);
    v.add(velocity);previous[j].copy(old);
    const wind=p.hairWind*(.65+.35*Math.sin(time*2.3))+gust;
    v.x+=(wind*7*H+(rest[j].x-v.x)*p.hairStiffness*160)*step*step;
    v.y+=(-2.5*H+(rest[j].y-v.y)*p.hairStiffness*160)*step*step;
    v.z+=(Math.sin(time*3+j*.4)*wind*2*H+(rest[j].z-v.z)*p.hairStiffness*160)*step*step;
   }
   for(let iteration=0;iteration<8;iteration++){
    nodes[0].copy(rest[0]);
    for(let j=1;j<nodes.length;j++){
     const delta=nodes[j].clone().sub(nodes[j-1]),distance=delta.length();
     if(distance>1e-8){delta.multiplyScalar((distance-lengths[j-1])/distance);if(j===1)nodes[j].sub(delta);else{nodes[j].addScaledVector(delta,-.5);nodes[j-1].addScaledVector(delta,.5);}}
     collide(nodes[j]);
    }
   }
  }
 }
 function update(dt){
  accumulator+=Math.min(Math.max(dt||0,0),.05);
  while(accumulator>=step){integrate();accumulator-=step;}
  for(const {nodes,geometry} of locks){const positions=geometry.attributes.position;
   for(let j=0;j<nodes.length;j++){
    const tangent=nodes[Math.min(j+1,segments)].clone().sub(nodes[Math.max(0,j-1)]).normalize();
    const u=new THREE.Vector3(0,0,1).cross(tangent).normalize();if(u.lengthSq()<.01)u.set(1,0,0);
    const v=tangent.clone().cross(u).normalize(),radius=H*(.027*(1-j/segments)+.003);
    for(let r=0;r<sides;r++){const a=r/sides*Math.PI*2,point=nodes[j].clone().addScaledVector(u,Math.cos(a)*radius).addScaledVector(v,Math.sin(a)*radius);positions.setXYZ(j*sides+r,point.x,point.y,point.z);}
   }
   positions.needsUpdate=true;geometry.computeVertexNormals();
  }
 }
 update(0);
 return {update,gust(){gust=4;},locks};
}
