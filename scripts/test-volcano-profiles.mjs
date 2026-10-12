import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const context={window:{}};
vm.runInNewContext(readFileSync('assets/js/volcano-history.js','utf8'),context);
for(const [id,record] of Object.entries(context.window.VolcanoHistory)) {
 test(`${id}: reservoirs, stages and provenance`,()=>{
  const p=record.conduit;
  for(const r of p.reservoirs){assert.ok(r.depthKm-r.ryKm>=0);assert.ok(r.depthKm+r.ryKm<=p.maxDepthKm);assert.ok(r.meltFraction>0&&r.meltFraction<=1);}
  assert.deepEqual(Array.from(p.stages,s=>s.at),Array.from(record.timeline,s=>s.at));
  assert.deepEqual(Array.from(p.stages,s=>s.key),Array.from(record.timeline,s=>s.label));
  const walk=(value,meta,path)=>{
   if(Array.isArray(value))return value.forEach((v,i)=>walk(v,meta?.[i],`${path}.${i}`));
   if(value && typeof value==='object')return Object.entries(value).filter(([k])=>!['sources','evidence','provenance'].includes(k)).forEach(([k,v])=>walk(v,meta?.[k],`${path}.${k}`));
   assert.ok(meta?.src && p.sources[meta.src],path); assert.ok(['measured','inferred','debated','illustrative'].includes(meta.confidence),path);
  };walk(p,p.provenance,id);
  for(const r of p.reservoirs)for(const e of Object.values(r.evidence)){assert.ok(p.sources[e.src]);assert.ok(['measured','inferred','debated','illustrative'].includes(e.confidence));}
  // Each sheet endpoint must touch a reservoir, another sheet or the edifice.
  const attached=(x,y,d)=>p.reservoirs.some(r=>((x-r.x)/r.rxKm)**2+((y-r.depthKm)/r.ryKm)**2<=1.2) || p.dikes.some(o=>o!==d&&[[o.x1,o.y1],[o.x2,o.y2]].some(([ox,oy])=>Math.hypot(x-ox,y-oy)<.3)) || y<=0;
  for(const d of p.dikes){assert.ok(attached(d.x1,d.y1,d),`${id} feeder origin`);assert.ok(attached(d.x2,d.y2,d),`${id} feeder end`);}
  if(id==='yellowstone')assert.equal(p.dikes.length,0);
 });
}
context.document={querySelector:()=>null,getElementById:()=>null};
vm.runInNewContext(readFileSync('assets/js/volcano-conduit.js','utf8'),context);
test('diagnostics distinguish rock pressure, buoyancy, reservoir and erupted volume',()=>{
 const engine=Object.create(context.window.VolcanoConduitEngine.prototype);
 Object.assign(engine,{profile:context.window.VolcanoHistory.vesuvius79.conduit,mode:'historical',eruptionId:'vesuvius79',timeline:0,intensity:0,surface:{width:800,height:600},canvas:{getBoundingClientRect:()=>({left:0,right:800,top:0,bottom:600})}});
 const d=engine.recalculateDiagnostics();
 assert.equal(d.rockPressureMPa,198.7);assert.equal(d.buoyancyMPa,18.4);
 assert.equal(d.totalVolumeKm3,26.6);assert.equal(d.meltVolumeKm3,9.3);
 assert.equal(d.overpressureMPa,undefined);assert.equal(d.eruptedDRE[0],1.5);
 assert.equal(engine.active(),false);engine.setTimeline(.1,82);assert.equal(engine.active(),false);engine.setTimeline(.58,82);assert.equal(engine.active(),true);engine.setTimeline(1,0);assert.equal(engine.active(),false);assert.equal(engine.recalculateDiagnostics().meltVolumeKm3,7.8);
 engine.trueScale=true;assert.equal(engine.layout().ve,1);
 const screen=engine.worldToScreen(1,7),world=engine.screenToWorld(screen.x,screen.y);assert.ok(Math.abs(world.x-1)<1e-9);assert.ok(Math.abs(world.depth-7)<1e-9);
});

test('caldera floor subsides below the rim rather than retaining a central summit',()=>{
 const engine=Object.create(context.window.VolcanoConduitEngine.prototype);
 Object.assign(engine,{profile:context.window.VolcanoHistory.tambora1815.conduit,mode:'historical',eruptionId:'tambora1815',timeline:0,intensity:0});
 const before=engine.surfaceDepth(0); engine.timeline=1;
 assert.ok(engine.surfaceDepth(0)>before);assert.ok(engine.surfaceDepth(0)>engine.surfaceDepth(3));
});
