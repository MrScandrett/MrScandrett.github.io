/* Path Studio pathfinder: unite, minus front, intersect and exclude.
 *
 * Shapes are flattened to polygons in artboard space, combined by the Manifold
 * kernel's CrossSection (Clipper2 inside: robust with touching edges, shared
 * vertices and holes), then refitted with cubic Béziers so the result is a
 * clean, editable path (a circle comes back as four smooth anchors, not 400
 * corners). The kernel is passed in, so the studio can load it lazily and the
 * tests can use the same build: `combine(kernel, objects, op)`.
 */
import { flattenSubpaths, fitClosed, worldSubpaths, withWorldSubpaths, polygonArea } from './vector-geometry.mjs';

export const OPS = Object.freeze({
  unite: 'Unite',
  minus: 'Minus front',
  intersect: 'Intersect',
  exclude: 'Exclude overlap',
});
const TOL = 0.08; // px: flattening tolerance
const FIT = 0.3; // px: how far the refitted curve may stray from the exact outline

/** Closed rings of an object in artboard space (open subpaths close for fill, like SVG). */
export function ringsOf(o) {
  return flattenSubpaths(worldSubpaths(o), TOL).map((r) => r.points).filter((p) => p.length >= 3 && Math.abs(polygonArea(p)) > 1e-6);
}

/**
 * Combine objects (bottom → top order). Returns a new path object styled like
 * the top object (the back object for "minus front"), or null if nothing is left.
 */
export function combine(kernel, objects, op) {
  const { CrossSection } = kernel;
  if (!OPS[op]) throw Error(`Unknown operation ${op}`);
  const usable = objects.filter((o) => o.type !== 'text');
  if (usable.length < 2) throw Error('Select at least two shapes or paths');
  const live = [];
  const make = (o) => { const cs = new CrossSection(ringsOf(o), 'NonZero'); live.push(cs); return cs; };
  const keep = (cs) => { live.push(cs); return cs; };
  try {
    const parts = usable.map(make);
    let result;
    if (op === 'unite') result = keep(CrossSection.union(parts));
    else if (op === 'intersect') result = parts.slice(1).reduce((acc, p) => keep(acc.intersect(p)), parts[0]);
    else if (op === 'minus') result = keep(parts[0].subtract(keep(CrossSection.union(parts.slice(1)))));
    else result = parts.slice(1).reduce((acc, p) => keep(keep(acc.add(p)).subtract(keep(acc.intersect(p)))), parts[0]);
    const polys = result.toPolygons();
    const subs = polys.map((ring) => fitClosed(ring, FIT)).filter(Boolean);
    if (!subs.length) return null;
    const style = op === 'minus' ? usable[0] : usable[usable.length - 1];
    const out = withWorldSubpaths({ ...style, rotation: 0 }, subs, 0);
    out.name = `${OPS[op]} result`;
    delete out.group;
    return out;
  } finally {
    for (const cs of live) { try { cs.delete(); } catch { /* already freed */ } }
  }
}
