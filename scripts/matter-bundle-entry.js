// Source for assets/vendor/matter-bundle.min.js — a single pinned Matter.js build
// for lesson sims that need real 2D rigid-body collision (grain-on-grain contact,
// not just independently-moving points). Only the modules lessons actually use
// are re-exported, to keep the bundle small.
//
// Consume from a lesson as: import { Engine, Bodies, Body, Composite } from
// assets/vendor/matter-bundle.min.js (path relative to the importing file).
//
// Rebuild with: npm run build:matter
export { Engine, Bodies, Body, Composite, World } from "matter-js";
