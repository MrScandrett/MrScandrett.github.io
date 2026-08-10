// Source for assets/vendor/three-bundle.min.js — a single pinned Three.js build for
// lesson sims to import, instead of each lesson picking its own CDN version/importmap
// (lessons have shipped r128, r134, and three different 0.16x pins alongside this
// repo's own vendored 0.180 copy). Uses the same three@0.180.0 devDependency that
// scripts/build-breadboard-model.mjs and scripts/build-plato-cave-model.mjs already
// use to pre-generate GLB assets, so build-time and runtime versions match.
//
// Consume from a lesson as: import THREE/OrbitControls/OBJLoader/etc. from
// assets/vendor/three-bundle.min.js (path relative to the importing file).
//
// Rebuild with: npm run build:three
export * as THREE from "three";
export { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
export { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
export { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
export { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
