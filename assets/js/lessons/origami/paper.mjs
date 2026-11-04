// Convex paper panels are clipped at a straight hinge, never stretched.
export const sheet = () => [{ points: [[-7.5,-7.5],[7.5,-7.5],[7.5,7.5],[-7.5,7.5]], face: 0 }];
export const cross = (p,a,b) => (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
export function clip(points,a,b,side) {
  const out=[];
  points.forEach((p,i)=>{
    const q=points[(i+1)%points.length], d=cross(p,a,b)*side,e=cross(q,a,b)*side;
    if(d>=-1e-8) out.push(p);
    if(d*e < -1e-12) { const t=d/(d-e); out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]); }
  });
  return out;
}
export const area = p => Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);
export function rotate(p,fold,angle) {
  const [a,b]=[fold.a,fold.b],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  const ux=dx/len,uy=dy/len,t=(p[0]-a[0])*ux+(p[1]-a[1])*uy;
  const x=a[0]+ux*t,y=a[1]+uy*t,r=angle*Math.PI/180*(fold.direction==='mountain'?-1:1)*fold.side;
  const distance=((p[0]-x)*-uy+(p[1]-y)*ux);
  return [x+(p[0]-x)*Math.cos(r),y+(p[1]-y)*Math.cos(r),distance*Math.sin(r)];
}
export function foldPanels(panels,fold,angle=180) {
  const fixed=[],moving=[];
  panels.forEach(panel=>{
    const a=clip(panel.points,fold.a,fold.b,-fold.side),b=clip(panel.points,fold.a,fold.b,fold.side);
    if(a.length>=3&&area(a)>1e-7) fixed.push({...panel,points:a.map(p=>[...p,0])});
    if(b.length>=3&&area(b)>1e-7) moving.push({face:panel.face, moving:true,points:b.map(p=>rotate(p,fold,angle))});
  });
  return [...fixed,...moving.reverse()];
}
export function commit(panels,fold) {return foldPanels(panels,fold).map(p=>({points:p.points.map(v=>v.slice(0,2)),face:p.moving?1-p.face:p.face}));}
export function validFold(panels,f) {
  if(Math.hypot(f.b[0]-f.a[0],f.b[1]-f.a[1])<.1) return false;
  let positive=0,negative=0;
  panels.forEach(p=>{positive+=area(clip(p.points,f.a,f.b,1));negative+=area(clip(p.points,f.a,f.b,-1));});
  return positive>1e-5&&negative>1e-5;
}
