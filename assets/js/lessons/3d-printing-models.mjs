// Shared teaching geometry: X/Z footprints in mm, Y is print height.
export const PRINT_MODELS = {
  box: {name:'Straight box',note:'Vertical walls have no external overhang. Compare infill and walls; external supports add no benefit.',supports:[]},
  ledge: {name:'Cantilever ledge',note:'At 40 mm, a 28 mm ledge begins in mid-air, attached on one side. Compare supports under the ledge with redesigning or rotating the real part.',supports:[[-8,20,-10,10,40]],risk:'overhang'},
  bridge: {name:'Bridge / doorway',note:'At 40 mm, the roof spans a 24 mm gap between two pillars. A bridge is anchored at both ends: test cooling and material before deciding whether supports are needed.',supports:[[-12,12,-10,10,40]],risk:'bridge'},
  ramp: {name:'Gradual overhang',note:'The edge advances 0.5 mm outward per 1 mm upward (about 27° from vertical). Each layer overlaps the one below. Compare with the sudden ledge; actual limits depend on your printer and material.',supports:[]},
};
export function modelFor(key){return PRINT_MODELS[key] || PRINT_MODELS.box;}
export function sections(key,y){
  if(key==='ledge')return y<=40?[[-20,-8,-10,10]]:[[-20,20,-10,10]];
  if(key==='bridge')return y<=40?[[-20,-12,-10,10],[12,20,-10,10]]:[[-20,20,-10,10]];
  if(key==='ramp')return [[-20,Math.min(20,-8+y*0.5),-10,10]];
  return [[-20,20,-20,20]];
}
export function isSkin(key,y,lh){return y<=4*lh || y>60-4*lh || ((key==='ledge'||key==='bridge') && y>40 && y<=40+4*lh);}
export function estimate(s){
  const layers=Math.round(60/s.lh),wall=s.walls*0.4;
  let shell=0,skin=0,infill=0;
  for(let l=1;l<=layers;l++)for(const [x0,x1,z0,z1] of sections(s.model,l*s.lh)){
    const area=(x1-x0)*(z1-z0),inner=Math.max(0,x1-x0-2*wall)*Math.max(0,z1-z0-2*wall);
    shell+=(area-inner)/0.4;
    if(isSkin(s.model,l*s.lh,s.lh))skin+=inner/0.4;else infill+=inner/0.4*s.inf/100;
  }
  // Support volume is a stated density approximation, not a sliced toolpath.
  const support=s.sup==='none'?0:modelFor(s.model).supports.reduce((n,[x0,x1,z0,z1,h])=>n+(x1-x0)*(z1-z0)*h*(s.sup==='tree'?0.08:0.2)/(0.4*s.lh),0);
  const extrusion=shell+skin+infill+support,total=extrusion*1.18*(support?1.1:1);
  return {layers,wallMm:wall.toFixed(1),timeMin:Math.max(1,Math.round(total/s.spd/60)),filament:Math.round(extrusion*0.4*s.lh*1.24/1000*10)/10,tShell:shell/total,tTopBot:skin/total,tInfill:infill/total,tSupport:support/total,tTravel:1-extrusion/total};
}
