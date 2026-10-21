// Source for assets/vendor/three-fx.min.js: scene effects (water, sky, bloom post-processing)
// for lesson sims that need them. Kept out of three-bundle.min.js so ordinary sims don't
// download them, and out of three-extras.min.js (the Asset Bench's loaders/exporters).
//
// Like three-extras, it has no copy of Three.js of its own: scripts/build-three-extras.mjs
// points every `import ... from "three"` at the shared three-bundle.min.js.
//
// Rebuild with: npm run build:three-extras (after npm run build:three)
export { Water } from "three/examples/jsm/objects/Water.js";
export { Sky } from "three/examples/jsm/objects/Sky.js";
export { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
export { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
export { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
export { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
