// Source for assets/vendor/three-extras.min.js: the file-format loaders and exporters
// the Game Asset Studio's Asset Bench needs to open work from any 3D app and hand it
// back. Kept out of three-bundle.min.js so ordinary lesson sims don't download them.
//
// It does NOT contain its own copy of Three.js: scripts/build-three-extras.mjs points
// every `import ... from "three"` at the shared three-bundle.min.js, so both files use
// the same THREE instance (loaders' objects pass instanceof checks in the shared scene).
//
// Rebuild with: npm run build:three-extras (after npm run build:three)
export { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
export { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
export { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
export { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
export { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
export { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
export { USDZLoader } from "three/examples/jsm/loaders/USDZLoader.js";
export { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
export { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
export { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
export * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
export * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
