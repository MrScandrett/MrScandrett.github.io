// Source for assets/vendor/d3-galaxy.min.js — the only d3 surface applications.html
// uses for the STEAM Galaxy map.
//
// Importing "d3" from a CDN as ESM pulls the full package, which fans out into ~44
// separate module requests before the map can even start. Bundling just these four
// packages locally makes it one request.
//
// Rebuild with: npm run build:d3
export { select } from "d3-selection";
export { zoom, zoomIdentity } from "d3-zoom";
export { line, curveCatmullRom } from "d3-shape";
export {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY
} from "d3-force";
