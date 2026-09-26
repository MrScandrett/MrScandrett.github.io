/* Original teaching meshes. Cutaways and colors are interpretive, not microscopy.
 * Coordinates in arbitrary units; individual structures are enlarged for teaching.
 */
import { THREE } from '../vendor/three-bundle.min.js';
const V = (x,y,z) => new THREE.Vector3(x,y,z);
const materials = {};
function mat(color, roughness=.36) {
  const key = `${color}/${roughness}`;
  return materials[key] ||= new THREE.MeshPhysicalMaterial({color, roughness, metalness:0, clearcoat:.28, clearcoatRoughness:.3, side:THREE.DoubleSide});
}
function mesh(parent, geometry, material, position=[0,0,0], scale=[1,1,1]) {
  const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function ball(g,p,s,color,r=.36) {return mesh(g,new THREE.SphereGeometry(1,40,28),mat(color,r),p,s);}
function tube(g,points,r,color,closed=false) {
  return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>V(...p)),closed),Math.max(32,points.length*5),r,8,closed),mat(color));
}
function group(g,p=[0,0,0],scale=1) {const n=new THREE.Group();n.position.set(...p);n.scale.setScalar(scale);g.add(n);return n;}
function tag(g,key,point,title) {g.userData.organelle=key;g.userData.label=title;g.userData.anchor=V(...point);return g;}
function shell(g,axes,color,thickness=.045) {
  // Open anterior hemisphere; the concave inner surface makes the cutaway explicit.
  const geo=new THREE.SphereGeometry(1,80,40,0,Math.PI*2,Math.PI/2,Math.PI/2);
  geo.rotateX(Math.PI/2); // open toward +z
  mesh(g,geo,mat(color),[0,0,0],axes);
  const pts=[];for(let i=0;i<96;i++){const a=i/96*Math.PI*2;pts.push([axes[0]*Math.cos(a),axes[1]*Math.sin(a),0]);}
  tube(g,pts,thickness,color,true);
}
function nucleus(g,p,s=1) {
 const n=tag(group(g,p,s),'nucleus',[0,.2,.5],'Nucleus');
 shell(n,[.69,.64,.55],0xb08fae,.025);
 ball(n,[0,0,-.19],[.64,.59,.35],0x8b688d,.6);
 ball(n,[.13,-.02,.17],[.23,.23,.2],0xc493a8,.26);
 for(let j=0;j<5;j++){
  const ps=[];for(let i=0;i<32;i++){const a=i/31*Math.PI*2;ps.push([Math.cos(a)*(.27+j*.052),Math.sin(a)*(.29+j*.034),-.04+.06*Math.sin(a*5+j)]);}
  tube(n,ps,.013,0xd3b4cd,true);
 }
 // Pores on the visible nuclear envelope, exaggerated to be legible.
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const ring=mesh(n,new THREE.TorusGeometry(.022,.008,6,12),mat(0xdbc5d8),[.66*Math.cos(a),.61*Math.sin(a),.012]);ring.scale.setScalar(1);}
 return n;
}
function mitochondrion(g,p,a=0,s=1) {
 const n=tag(group(g,p,s),'mitochondria',[0,0,.2],'Mitochondrion');n.rotation.z=a;
 shell(n,[.5,.235,.22],0xd99a6e,.018);
 ball(n,[0,0,-.09],[.47,.205,.11],0x995642,.55);
 // The folded ribbon is continuous with an inner membrane, not free-floating squiggles.
 const points=[];for(let i=0;i<=80;i++){const x=-.41+i/80*.82;points.push([x,.135*Math.sin(i/80*Math.PI*12),.025]);}
 tube(n,points,.022,0xf0ba86);
 const rim=[];for(let i=0;i<64;i++){let a=i/64*Math.PI*2;rim.push([.455*Math.cos(a),.19*Math.sin(a),.017]);}tube(n,rim,.012,0xf2c199,true);
 return n;
}
function chloroplast(g,p,a=0,s=1) {
 const n=tag(group(g,p,s),'chloroplasts',[0,0,.2],'Chloroplast');n.rotation.z=a;
 shell(n,[.48,.245,.23],0x75985a,.025);
 ball(n,[0,0,-.08],[.45,.22,.11],0x9aad6a,.6);
 for(let j=0;j<4;j++){
  const x=-.3+j*.2;
  for(let k=0;k<5;k++) {const disc=mesh(n,new THREE.CylinderGeometry(.073,.073,.018,20),mat(0x406b3e),[x,0,-.025+k*.03]);disc.rotation.x=Math.PI/2;}
  if(j<3)tube(n,[[x,0,.018],[x+.1,.03,.018],[x+.2,0,.018]],.012,0x517d40);
 }
 return n;
}
function ribbon(g,x,y,z,width,height,color,phase=0) {
 const pos=[],idx=[];
 for(let i=0;i<=48;i++){
  const t=i/48; const xx=x+(t-.5)*width, yy=y+Math.sin(t*Math.PI)*height;
  pos.push(xx,yy,z+.055*Math.sin(t*10+phase),xx,yy+.065,z-.19+.035*Math.sin(t*10+phase));
  if(i<48){let a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(g,geo,mat(color));
}
function animal() {
 const g=new THREE.Group();tag(g,'cell-membrane',[1.9,-.8,0],'Cell membrane');
 shell(g,[2.55,2.05,1.15],0x819ca4,.045);
 const cyt=ball(g,[0,0,-.63],[2.3,1.8,.43],0x708991,.65);cyt.castShadow=false;
 nucleus(g,[-.6,.23,-.09],1.17);
 const er=tag(group(g),'rough-er',[-1.3,1.12,0],'Rough ER');
 for(let i=0;i<5;i++){
  ribbon(er,-.92,.65+i*.16,-.16,1.7,.22,0x6b90ab,i);
  for(let k=0;k<11;k++){const t=k/10;ball(er,[-1.77+t*1.7,.65+i*.16+Math.sin(t*Math.PI)*.22,.025+.055*Math.sin(t*10+i)],[.024,.024,.024],0xd6baaf);}
 }
 mitochondrion(g,[1.27,.94,-.07],-.45,1);mitochondrion(g,[1.55,-.86,-.1],.6,.86);mitochondrion(g,[-1.43,-.94,-.1],-.45,.87);
 const golgi=tag(group(g),'golgi',[.72,-.4,.07],'Golgi apparatus');
 for(let i=0;i<5;i++)ribbon(golgi,.68,-.65+i*.14,-.02,.92-i*.07,-.15,0xc9a269,i);
 for(let i=0;i<7;i++)ball(g,[1.19+Math.sin(i*8)*.12,-.48+i*.12,.02],[.045,.045,.045],0xd8b780);
 for(let i=0;i<3;i++)ball(g,[-.2+i*.46,-1.28+Math.sin(i*2)*.16,-.2],[.12,.12,.12],0xa88aab);
 const ribs=tag(group(g),'ribosomes',[.6,1.45,-.15],'Free ribosomes');
 for(let i=0;i<140;i++){
  const a=i*2.39996,rad=Math.sqrt((i+.5)/140);const x=Math.cos(a)*2.27*rad,y=Math.sin(a)*1.78*rad;
  if((x+.6)**2+(y-.23)**2<.7)continue;
  ball(ribs,[x,y,-.34],[.022,.022,.022],0xd2b3a3);
 }
 return g;
}
function bacteria() {
 const g=new THREE.Group();
 const s=tag(group(g),'cell-wall',[-2.15,.35,0],'Cell wall');shell(s,[2.65,1.13,.83],0xb3a074,.06);
 shell(g,[2.57,1.04,.75],0x849c88,.028);
 ball(g,[0,0,-.42],[2.38,.9,.27],0x7c9283,.65);
 const dna=tag(group(g),'nucleoid',[.1,.12,.13],'Nucleoid · DNA');
 const pts=[];for(let i=0;i<230;i++){const t=i/230*Math.PI*2;pts.push([1.43*Math.cos(t)+.14*Math.sin(t*19),.33*Math.sin(t*7),-.02+.17*Math.cos(t*11)]);}tube(dna,pts,.026,0xdcb689,true);
 const ribs=tag(group(g),'ribosomes',[-1.7,-.35,-.2],'Ribosomes');
 for(let i=0;i<120;i++){const a=i*2.39996,r=Math.sqrt((i+.5)/120);const x=Math.cos(a)*2.25*r,y=Math.sin(a)*.87*r;ball(ribs,[x,y,-.24],[.026,.026,.026],0xc8bfce);}
 const ring=mesh(g,new THREE.TorusGeometry(.17,.023,8,36),mat(0xdcb689),[1.7,-.36,.02]);ring.rotation.x=.35;
 const flag=tag(group(g),'flagellum',[3.4,.1,0],'Flagellum');const fp=[];for(let i=0;i<90;i++){const t=i/89;fp.push([2.62+t*1.7,.15*Math.sin(t*Math.PI*7),-.1+.13*Math.cos(t*Math.PI*7)]);}tube(flag,fp,.026,0xb5a47f);
 for(let i=0;i<22;i++){const a=i/22*Math.PI*2;const x=2.65*Math.cos(a),y=1.13*Math.sin(a);tube(g,[[x,y,-.12],[x*1.06,y*1.15,-.05],[x*1.1,y*1.3,-.12]],.014,0xb7a582);}
 g.position.x=-.55;g.scale.setScalar(.9);return g;
}
function roundedBox(w,h,depth,r=.15) {
 const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
 const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:3,steps:1,curveSegments:8});return geo;
}
function plant() {
 const g=new THREE.Group();
 const wall=tag(group(g),'cell-wall',[-2.43,.3,.1],'Cellulose wall');
 mesh(wall,roundedBox(4.9,3.9,.13),mat(0x82925f),[0,0,-1]);
 for(const x of [-2.36,2.36])mesh(wall,new THREE.BoxGeometry(.17,3.76,1.05),mat(0x9aab75),[x,0,-.43]);
 for(const y of [-1.86,1.86])mesh(wall,new THREE.BoxGeometry(4.6,.17,1.05),mat(0x9aab75),[0,y,-.43]);
 // Thin membrane follows inside the wall, independent from vacuole tonoplast.
 const corners=[[-2.24,-1.74,.08],[2.24,-1.74,.08],[2.24,1.74,.08],[-2.24,1.74,.08]];tube(g,corners,.025,0xc9b99b,true);
 const vac=tag(group(g),'vacuole',[.25,.3,.32],'Central vacuole');
 mesh(vac,roundedBox(3.13,2.72,.51,.48),new THREE.MeshPhysicalMaterial({color:0x8fbdc2,roughness:.22,metalness:0,clearcoat:.5,transparent:true,opacity:.86,side:THREE.DoubleSide}),[.25,0,-.45]);
 nucleus(g,[-1.79,-.3,-.06],.58);
 for(const [x,y,a] of [[-1.77,1.08,1.2],[-1.83,-1.15,1.1],[1.94,1.06,1.5],[1.95,-.3,1.4],[1.78,-1.38,.1],[-.6,1.57,0],[.6,1.57,0],[-.3,-1.57,0]])chloroplast(g,[x,y,-.05],a,.67);
 mitochondrion(g,[-1.8,.39,-.06],1.4,.52);mitochondrion(g,[.75,-1.56,-.08],0,.59);
 return g;
}
function redCell() {
 const g=new THREE.Group();
 const pos=[],idx=[],n=96,m=48;
 for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){
  const t=j/m*Math.PI,a=i/n*Math.PI*2,r=Math.sin(t);
  const z=.46*Math.cos(t)*(.25+1.9*r*r-1.05*r**4);
  pos.push(1.48*r*Math.cos(a),1.48*r*Math.sin(a),z);
  if(j<m&&i<n){const q=j*(n+1)+i;idx.push(q,q+n+1,q+1,q+1,q+n+1,q+n+2);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 const main=mesh(g,geo,mat(0xa92e40,.28),[-.65,.2,0]);main.rotation.set(.18,-.25,.1);
 const side=mesh(g,geo,mat(0xb03745,.32),[1.9,-.5,-.1],[.6,.6,.6]);side.rotation.y=1.35;
 tag(main,'red-blood-cell',[0,0,.2],'Biconcave disc');return g;
}
function neuron() {
 const g=new THREE.Group();
 const soma=ball(g,[-1.6,0,0],[.56,.61,.39],0xcab498);tag(soma,'nucleus',[0,0,.45],'Cell body');
 ball(g,[-1.62,.02,.32],[.2,.2,.13],0xa780a3);
 for(let i=0;i<7;i++){
  const a=1.25+i*.63;const start=[-1.6+.4*Math.cos(a),.4*Math.sin(a),0];const end=[-1.6+1.36*Math.cos(a),1.36*Math.sin(a),-.12];
  tube(g,[start,[-1.6+.85*Math.cos(a+.12),.85*Math.sin(a+.12),.05],end],.05,0xcab498);
  for(const sign of [-1,1])tube(g,[end,[end[0]+.25*Math.cos(a+sign*.7),end[1]+.25*Math.sin(a+sign*.7),-.1],[end[0]+.48*Math.cos(a+sign*.7),end[1]+.48*Math.sin(a+sign*.7),-.05]],.023,0xcab498);
 }
 const axon=[];for(let i=0;i<40;i++){const x=-1.13+i/39*3.8;axon.push([x,Math.sin(x*2)*.09,0]);}tube(g,axon,.056,0xcab498);
 for(let i=0;i<6;i++){
  const x=-.75+i*.53;const wrap=mesh(g,new THREE.CapsuleGeometry(.13,.3,8,20),mat(0xbcc8c9,.3),[x,Math.sin(x*2)*.09,0]);wrap.rotation.z=Math.PI/2;
  for(let j=0;j<6;j++){let xx=x-.12+j*.048;let ring=mesh(g,new THREE.TorusGeometry(.133,.008,6,20),mat(0x829698),[xx,Math.sin(x*2)*.09,0]);ring.rotation.y=Math.PI/2;}
 }
 for(let i=0;i<5;i++){let y=(i-2)*.28;tube(g,[[2.62,-.08,0],[2.9,y,0],[3.25,y*1.4,.1]],.024,0xcab498);ball(g,[3.25,y*1.4,.1],[.057,.057,.057],0xcab498);}
 g.scale.setScalar(.87);return g;
}
function rootHair() {
 const g=new THREE.Group();
 mesh(g,roundedBox(1.6,2.8,.55,.2),mat(0xb2ad86),[-1.45,0,-.4]);
 mesh(g,roundedBox(1.37,2.55,.08,.17),mat(0x8cafb1),[-1.45,0,.18]);
 const pts=[[-.68,.55,-.04],[.1,.65,-.04],[1.2,.95,-.04],[2.2,1.15,-.04],[2.7,1.3,-.04]];
 tube(g,pts,.16,0xb2ad86);tube(g,pts.map(p=>[p[0],p[1],p[2]+.09]),.09,0x8cafb1);
 nucleus(g,[-.72,.42,.22],.23);return g;
}
function muscle() {
 const g=new THREE.Group();
 for(let j=0;j<3;j++){
  const f=mesh(g,new THREE.CapsuleGeometry(.34,4.7,10,36),mat(0xb87572,.45),[0,(j-1)*.86,0]);f.rotation.z=Math.PI/2;
  for(let i=0;i<62;i++){const x=-2.25+i/61*4.5;const ring=mesh(g,new THREE.TorusGeometry(.342,.013,6,24),mat(i%3===0?0x86555b:0xd8998e),[x,(j-1)*.86,0]);ring.rotation.y=Math.PI/2;}
  for(let i=0;i<3;i++)ball(g,[-1.7+i*1.55,(j-1)*.86+.19,.26],[.18,.06,.055],0x927492);
 }
 return g;
}
export const MODEL_INFO={
 bacteria:['Bacterial cell','The front half is cut away to expose coiled DNA and ribosomes. Wall and membrane thicknesses are exaggerated.'],
 animal:['Animal cell','An open membrane reveals folded organelles inside the cytoplasm. The nucleus and mitochondria are also shown in cutaway.'],
 plant:['Photosynthetic plant cell','The front wall is removed. A large central vacuole leaves a peripheral layer of cytoplasm containing the nucleus, chloroplasts and mitochondria.'],
 neuron:['Myelinated neuron','Branched dendrites, a cell body and an axon with separate myelin segments. The axon is greatly shortened.'],
 'red-blood-cell':['Human red blood cell','Two views of a biconcave disc. The center is thin, not a hole; mature human red blood cells lack a nucleus and mitochondria.'],
 'root-hair':['Root hair cell','A cutaway of one cell with a continuous hair extension and a large vacuole. No chloroplasts are shown in this underground cell.'],
 muscle:['Skeletal muscle fibers','Three elongated cells with repeated contractile units and multiple nuclei near their surfaces.']
};
export function buildCellModel(type){return ({animal,bacteria,plant,neuron,'red-blood-cell':redCell,'root-hair':rootHair,muscle}[type]||animal)();}
