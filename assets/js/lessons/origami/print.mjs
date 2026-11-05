import { bounds, edgeReport, placeOnBed, writeBinaryStl } from '../../fab-io.mjs';

// Convex rigid panels become closed prisms, then a Boolean union removes
// internal faces and fuses coincident paper layers. All kernel geometry is mm.
export function printablePaper(kernel, panels, { size = 150, thickness = 1.2 } = {}) {
  if (!Number.isFinite(size) || size < 30 || size > 300 ||
      !Number.isFinite(thickness) || thickness < .8 || thickness > 5) {
    throw Error('Use a sheet size of 30–300 mm and shell thickness of 0.8–5 mm.');
  }
  const allocated = [];
  const track = obj => (allocated.push(obj), obj);
  try {
    const solids = panels.map(({ points }) => {
      const p = points.map(v => [v[0]*size/15, v[1]*size/15, (v[2] || 0)*size/15]);
      const a=p[0], b=p[1];
      let normal;
      for (let i=2; i<p.length; i++) {
        const u=b.map((v,k)=>v-a[k]), v=p[i].map((v,k)=>v-a[k]);
        const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        const length=Math.hypot(...n);
        if(length>1e-8){normal=n.map(v=>v/length*thickness/2);break;}
      }
      if(!normal) throw Error('A panel is degenerate. Undo the last fold and try again.');
      return track(kernel.Manifold.hull(p.flatMap(v => [-1,1].map(sign => v.map((x,k)=>x+sign*normal[k])))));
    });
    const solid=track(kernel.Manifold.union(solids));
    if(solid.status()!=='NoError' || solid.isEmpty()) throw Error('Could not build a solid from this pose. Try a different angle.');
    const mesh=solid.getMesh(), positions=[];
    for(const index of mesh.triVerts) for(let k=0;k<3;k++) positions.push(mesh.vertProperties[index*mesh.numProp+k]);
    const onBed=placeOnBed(Float32Array.from(positions));
    if(!edgeReport(onBed).watertight) throw Error('This pose did not produce a closed printable surface. Try a different angle.');
    const components=track(solid.decompose()).length;
    return { buffer:writeBinaryStl(onBed, `Origami; mm; shell ${thickness}mm`), size:bounds(onBed).size, components };
  } finally {
    for(const object of allocated.flat().reverse()) object.delete();
  }
}
