// Shared teaching geometry: X/Z footprints in mm, Y is print height.
export const PRINT_MODELS = {
  box: {name:'Straight box',height:60,note:'Vertical walls have no external overhang. Compare infill and walls; external supports add no benefit.',supports:[]},
  ledge: {name:'Cantilever ledge (Upright)',height:60,note:'At 40 mm, a 28 mm ledge begins in mid-air, attached on one side. Requires support unless rotated.',supports:[[-8,20,-10,10,40]],risk:'overhang'},
  ledge_flat: {name:'Cantilever ledge (Rotated 90° flat)',height:40,note:'Rotated 90° so the ledge rests flat on the bed. Overhang is eliminated; zero supports needed; print time and waste plummet!',supports:[]},
  bridge: {name:'Bridge / doorway (Upright)',height:60,note:'At 40 mm, the roof spans a 24 mm gap between two pillars. Requires bridging capability or supports.',supports:[[-12,12,-10,10,40]],risk:'bridge'},
  bridge_flat: {name:'Bridge / doorway (Rotated flat)',height:20,note:'Rotated 90° onto its side so the span rests directly on the build plate. The overhang vanishes with zero support material.',supports:[]},
  ramp: {name:'Gradual overhang',height:60,note:'The edge advances 0.5 mm outward per 1 mm upward (about 27° from vertical). Each layer overlaps the one below. Compare with the sudden ledge.',supports:[]},
};
export function modelFor(key){return PRINT_MODELS[key] || PRINT_MODELS.box;}
export function modelHeight(key){return (PRINT_MODELS[key] && PRINT_MODELS[key].height) || 60;}
export function sections(key,y){
  if(key==='ledge')return y<=40?[[-20,-8,-10,10]]:[[-20,20,-10,10]];
  if(key==='ledge_flat')return y<=20?[[-20,40,-10,10]]:[[-20,-8,-10,10]];
  if(key==='bridge')return y<=40?[[-20,-12,-10,10],[12,20,-10,10]]:[[-20,20,-10,10]];
  if(key==='bridge_flat')return [[-20,20,-10,10]];
  if(key==='ramp')return [[-20,Math.min(20,-8+y*0.5),-10,10]];
  return [[-20,20,-20,20]];
}
export function isSkin(key,y,lh,topBotCount = 4){
  const h=modelHeight(key);
  const skinThick = (topBotCount || 4) * lh;
  if(y<=skinThick || y>h-skinThick) return true;
  if(key==='ledge' && y>40 && y<=40+skinThick) return true;
  if(key==='ledge_flat' && y>20 && y<=20+skinThick) return true;
  if(key==='bridge' && y>40 && y<=40+skinThick) return true;
  return false;
}
export function estimate(s){
  const h=modelHeight(s.model);
  const layers=Math.round(h/s.lh),wall=s.walls*0.4;
  const topBot = s.topBot || 4;
  const patternMult = s.pattern === 'lightning' ? 0.35 : (s.pattern === 'gyroid' ? 1.05 : 1.0);
  let shell=0,skin=0,infill=0;
  for(let l=1;l<=layers;l++){
    const y=l*s.lh;
    for(const [x0,x1,z0,z1] of sections(s.model,y)){
      const area=(x1-x0)*(z1-z0),inner=Math.max(0,x1-x0-2*wall)*Math.max(0,z1-z0-2*wall);
      shell+=(area-inner)/0.4;
      if(isSkin(s.model,y,s.lh,topBot))skin+=inner/0.4;else infill+=(inner/0.4*s.inf/100)*patternMult;
    }
  }
  // Support volume is a stated density approximation, not a sliced toolpath.
  const support=s.sup==='none'?0:modelFor(s.model).supports.reduce((n,[x0,x1,z0,z1,hLimit])=>n+(x1-x0)*(z1-z0)*Math.min(h,hLimit)*(s.sup==='tree'?0.08:0.2)/(0.4*s.lh),0);
  let adhesionExtrusion = 0;
  if(s.adhesion === 'brim') {
    adhesionExtrusion = 120 * 6; // 6 perimeter brim lines
  } else if(s.adhesion === 'raft') {
    adhesionExtrusion = (44 * 44 * 3) / (0.4 * s.lh); // 3-layer raft base
  }
  const extrusion=shell+skin+infill+support+adhesionExtrusion,total=extrusion*1.18*(support?1.1:1);
  return {layers,wallMm:wall.toFixed(1),timeMin:Math.max(1,Math.round(total/s.spd/60)),filament:Math.round(extrusion*0.4*s.lh*1.24/1000*10)/10,tShell:shell/total,tTopBot:skin/total,tInfill:infill/total,tSupport:support/total,tTravel:1-extrusion/total};
}
