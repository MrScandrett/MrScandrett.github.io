// One mesh per layout: different material maps may intentionally share UV space.
export function uvLayoutSvg(geometry) {
 const uv=geometry.attributes.uv;
 if(!uv)return null;
 const count=geometry.index?.count??geometry.attributes.position.count,paths=[];
 let outside=0;
 for(let i=0;i<count;i+=3){
  const points=[];
  for(let k=0;k<3;k++){
   const j=geometry.index?geometry.index.getX(i+k):i+k,u=uv.getX(j),v=uv.getY(j);
   if(!Number.isFinite(u)||!Number.isFinite(v))throw Error('UV coordinates must be finite.');
   if(u<0||u>1||v<0||v>1)outside++;
   points.push(`${(u*1024).toFixed(2)},${((1-v)*1024).toFixed(2)}`);
  }
  paths.push('M'+points.join('L')+'Z');
 }
 return {outside,triangles:count/3,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><title>UV triangle layout, 0–1 tile</title><defs><clipPath id="tile"><rect width="1024" height="1024"/></clipPath></defs><rect width="1024" height="1024" fill="white"/><path clip-path="url(#tile)" d="${paths.join('')}" fill="none" stroke="#163c53" stroke-width=".7"/><rect x="1" y="1" width="1022" height="1022" fill="none" stroke="#b04422" stroke-width="2"/></svg>`};
}
