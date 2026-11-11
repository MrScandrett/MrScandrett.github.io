// Broad, tailored armor surfaces are modeled independently from the sculpted anatomy.
export function addHeroEquipment(T,group,p,L,color){
 const {sH,hipY,shoulderY,neckY,headY,H,kneeY,hipHalf}=L;
 const dark='#202e3b',trim='#c6ac79';
 const surface=(outline,depth,position,paint,name)=>{
  const shape=new T.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3});
  const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color:paint,roughness:.5,metalness:paint===trim?.65:.15}));mesh.position.set(...position);mesh.name=name;group.add(mesh);return mesh;
 };
 const chestY=hipY+p.torso*.64,w=sH*.72;
 surface([[-w,.28],[-w*.55,.40],[0,.31],[w*.55,.40],[w,.28],[w*.85,-.18],[w*.35,-.34],[-w*.35,-.34],[-w*.85,-.18]],.11,[0,chestY,.31],color,'Contoured breastplate');
 for(const side of [-1,1]){
  const m=surface([[-.25,-.09],[-.30,.08],[-.20,.26],[.12,.32],[.30,.17],[.27,-.08],[0,-.16]],.43,[side*(sH*.95),shoulderY+.04,-.20],color,'Layered shoulder guard');m.rotation.z=-side*.16;
  surface([[-.18,.13],[.18,.13],[.23,-.03],[.12,-.20],[-.12,-.20],[-.23,-.03]],.10,[side*hipHalf*.6,kneeY,.16],dark,'Articulated knee guard');
  const armX=side*(sH+p.arm*.25),armY=shoulderY-p.arm*.72;
  surface([[-.11,.19],[.11,.23],[.15,-.21],[-.12,-.23]],.12,[armX,armY,.21],dark,'Forearm bracer');
  for(let i=0;i<2;i++)surface([[-.10,.02],[.1,.02],[.1,-.02],[-.1,-.02]],.015,[armX,armY+i*.12,.35],trim,'Bracer inlay');
  surface([[-.15,.14],[.15,.14],[.17,-.16],[-.17,-.16]],.16,[side*(hipHalf+.13),hipY-.06,.03],dark,'Belt pouch');
 }
 for(let i=0;i<3;i++){const width=w*(.69-i*.10);surface([[-width,.07],[width,.07],[width*.90,-.06],[-width*.90,-.06]],.05,[0,chestY-.42-i*.13,.33],dark,'Overlapping abdominal armor');}
 surface([[-.09,.09],[.09,.09],[.09,-.09],[-.09,-.09]],.03,[0,hipY+p.torso*.20,.32],trim,'Belt buckle');
 surface([[-.15,.09],[.15,.09],[.20,-.12],[-.20,-.12]],.12,[0,neckY-.08,-.30],dark,'Raised back collar');
}
