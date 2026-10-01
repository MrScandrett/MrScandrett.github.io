#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { NodeIO } from "@gltf-transform/core";
import { KHRLightsPunctual, KHRMaterialsEmissiveStrength, KHRMaterialsUnlit } from "@gltf-transform/extensions";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "assets", "models", "allegory_of_the_cave.glb");

// GLTFExporter uses FileReader in browsers. This small adapter gives it the
// same interface in Node without adding a build dependency.
globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      if (this.onloadend) this.onloadend({ target: this });
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
};

const scene = new THREE.Scene();
scene.name = "Plato Cave Limestone Cutaway";

const materials = {
  rock: new THREE.MeshStandardMaterial({ color: 0x5a4b3c, roughness: 0.96 }),
  rockLight: new THREE.MeshStandardMaterial({ color: 0x786551, roughness: 0.93 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x463a31, roughness: 1 }),
  shadowWall: new THREE.MeshStandardMaterial({ color: 0x9a8b73, roughness: 0.9 }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x17130f }),
  projectedShadow: new THREE.MeshBasicMaterial({ color: 0x0b0908, transparent: true, opacity: 0.86, depthWrite: false }),
  projectionGlow: new THREE.MeshStandardMaterial({ color: 0xf3c875, emissive: 0xd28a31, emissiveIntensity: 0.7, transparent: true, opacity: 0.3, depthWrite: false }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc98f68, roughness: 0.82 }),
  friend: new THREE.MeshStandardMaterial({ color: 0x405b78, roughness: 0.86 }),
  guide: new THREE.MeshStandardMaterial({ color: 0x8a4b35, roughness: 0.84 }),
  cushion: new THREE.MeshStandardMaterial({ color: 0x8f6b55, roughness: 0.92 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5d311b, roughness: 0.9 }),
  ember: new THREE.MeshStandardMaterial({ color: 0xd4481f, emissive: 0x9f2208, emissiveIntensity: 1.1 }),
  flame: new THREE.MeshStandardMaterial({ color: 0xff9e2c, emissive: 0xff5a12, emissiveIntensity: 1.7 }),
  flameCore: new THREE.MeshStandardMaterial({ color: 0xffed91, emissive: 0xffb72e, emissiveIntensity: 2 }),
  path: new THREE.MeshStandardMaterial({ color: 0x9b7850, roughness: 0.9 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x5c813b, roughness: 0.94 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x477138, roughness: 0.9 }),
  sun: new THREE.MeshStandardMaterial({ color: 0xffd45c, emissive: 0xffa91f, emissiveIntensity: 2.2 }),
  truth: new THREE.MeshStandardMaterial({ color: 0xf0cc77, emissive: 0x9b621b, emissiveIntensity: 0.25, roughness: 0.66 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x4d5358, metalness: 0.72, roughness: 0.42 }),
};

for (const [key, material] of Object.entries(materials)) material.name = `plato-${key}`;

function mesh(geometry, material, name, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const item = new THREE.Mesh(geometry, material);
  item.name = name;
  item.position.set(...position);
  item.rotation.set(...rotation);
  item.castShadow = true;
  item.receiveShadow = true;
  scene.add(item);
  return item;
}

function cylinderBetween(a, b, radius, material, name, radialSegments = 10) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start);
  const item = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), radialSegments), material);
  item.name = name;
  item.position.copy(start).add(end).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  item.castShadow = true;
  scene.add(item);
  return item;
}

function person({ name, x, y = 0.45, z = 0, clothing, seated = false, facing = 0, armsUp = false }) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.rotation.y = facing;

  // Adult proportions: a shaped ribcage, pelvis and neck replace the capsule.
  const skin = materials.skin.clone();
  skin.color.setHex(name.endsWith("2") ? 0xa97050 : name.endsWith("3") ? 0xdbad87 : 0xc98f68);
  const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x30251e, roughness: 0.98 });
  const oval = (label, pos, scale, material = skin) => {
    const part = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), material);
    part.name = `${name} ${label}`;
    part.position.set(...pos); part.scale.set(...scale); group.add(part);
    return part;
  };
  const limb = (a, b, radius, endRadius, label, material = skin) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const part = new THREE.Mesh(new THREE.CylinderGeometry(endRadius, radius, delta.length(), 16), material);
    part.name = `${name} ${label}`;
    part.position.copy(start).add(end).multiplyScalar(0.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    group.add(part);
  };
  const hipY = seated ? 0.56 : 0.96;
  const shoulderY = hipY + 0.63, faceY = shoulderY + 0.37;
  oval("pelvis", [0, hipY, 0], [0.25, 0.19, 0.16], clothing);
  oval("ribcage", [0, hipY + 0.37, -0.015], [0.28, 0.37, 0.17], clothing);
  oval("waist", [0, hipY + 0.12, 0], [0.21, 0.22, 0.15], clothing);
  limb([0, shoulderY, 0], [0, faceY - 0.13, 0], 0.075, 0.07, "neck");
  oval("cranium", [0, faceY + 0.035, 0], [0.145, 0.19, 0.145]);
  oval("jaw", [0, faceY - 0.07, 0.035], [0.115, 0.115, 0.12]);
  oval("chin", [0, faceY - 0.13, 0.07], [0.065, 0.04, 0.07]);
  oval("nose bridge", [0, faceY, 0.142], [0.025, 0.063, 0.031]);
  oval("nose tip", [0, faceY - 0.027, 0.168], [0.032, 0.025, 0.027]);
  for (const side of [-1, 1]) {
    oval("ear", [side * 0.145, faceY, 0], [0.024, 0.047, 0.03]);
    oval("eye", [side * 0.057, faceY + 0.028, 0.133], [0.018, 0.009, 0.008], materials.shadow);
    oval("brow", [side * 0.057, faceY + 0.05, 0.131], [0.031, 0.006, 0.009], hairMaterial);
  }
  oval("lower lip", [0, faceY - 0.082, 0.143], [0.038, 0.008, 0.009]);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.57), hairMaterial);
  hair.name = `${name} hair`; hair.position.set(0, faceY + 0.055, -0.008);
  hair.scale.set(0.151, 0.182, 0.15); group.add(hair);

  for (const side of [-1, 1]) {
    const shoulder = [side * 0.25, shoulderY, 0];
    const elbow = seated ? [side * 0.32, hipY + 0.3, 0.15] : [side * (armsUp ? 0.43 : 0.32), shoulderY - (armsUp ? 0.12 : 0.32), 0.02];
    const wrist = seated ? [side * 0.32, hipY + 0.08, 0.42] : [side * (armsUp ? 0.51 : 0.34), shoulderY + (armsUp ? 0.2 : -0.61), 0.12];
    oval("sleeve", shoulder, [0.11, 0.13, 0.12], clothing);
    limb(shoulder, elbow, 0.093, 0.068, "upper arm", clothing);
    oval("elbow", elbow, [0.068, 0.073, 0.068]);
    limb(elbow, wrist, 0.074, 0.042, "forearm");
    oval("palm", wrist, [0.051, 0.075, 0.029]);
    for (let finger = 0; finger < 4; finger++) {
      oval("finger", [wrist[0] + (finger - 1.5) * 0.019, wrist[1] - 0.069, wrist[2]], [0.011, 0.035 - Math.abs(finger - 1.5) * 0.004, 0.014]);
    }
    oval("thumb", [wrist[0] - side * 0.052, wrist[1] - 0.014, wrist[2] + 0.014], [0.018, 0.039, 0.02]).rotation.z = side * 0.4;
    const hip = [side * 0.13, hipY, 0];
    const knee = seated ? [side * 0.39, 0.22, 0.39] : [side * 0.15, 0.5, 0.025];
    const ankle = seated ? [-side * 0.14, 0.095, 0.49 + side * 0.045] : [side * 0.18, 0.10, 0.025];
    limb(hip, knee, 0.135, 0.095, "thigh", clothing);
    oval("knee", knee, [0.097, 0.10, 0.097], clothing);
    limb(knee, ankle, 0.097, 0.055, "calf", clothing);
    oval("foot", [ankle[0], 0.07, ankle[2] + 0.085], [0.075, 0.065, 0.16], materials.wood);
    // Long cloth folds make the tunic read as fabric rather than a plastic shell.
    const fold = oval("tunic fold", [side * 0.14, hipY + 0.3, 0.146], [0.017, 0.25, 0.025], clothing);
    fold.rotation.z = side * 0.08;
  }

  group.traverse((child) => { if (child.isMesh) child.castShadow = true; });
  scene.add(group);
  return group;
}

function silhouetteCylinder(group, a, b, radius, material, name) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start);
  const item = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 10), material);
  item.name = name;
  item.position.copy(start).add(end).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  group.add(item);
}

function knightSilhouette({ name, x, y, z, scale, material }) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.scale.setScalar(scale);

  const add = (geometry, label, position) => {
    const item = new THREE.Mesh(geometry, material);
    item.name = `${name} ${label}`;
    item.position.set(...position);
    group.add(item);
  };
  add(new THREE.BoxGeometry(0.46, 0.78, 0.1), "armored body", [0, 0.02, 0]);
  add(new THREE.SphereGeometry(0.22, 14, 10), "helmeted head", [0, 0.58, 0]);
  add(new THREE.ConeGeometry(0.27, 0.32, 4), "helmet crest", [0, 0.86, 0]);
  add(new THREE.CircleGeometry(0.34, 20), "round shield", [-0.4, 0.05, 0.07]);
  silhouetteCylinder(group, [-0.13, -0.34, 0], [-0.25, -0.88, 0], 0.09, material, `${name} left armored leg`);
  silhouetteCylinder(group, [0.13, -0.34, 0], [0.26, -0.88, 0], 0.09, material, `${name} right armored leg`);
  silhouetteCylinder(group, [0.26, 0.33, 0], [0.62, -0.42, 0], 0.045, material, `${name} sword`);
  add(new THREE.BoxGeometry(0.24, 0.055, 0.08), "sword guard", [0.31, 0.2, 0]);
  scene.add(group);
  return group;
}

function dragonSilhouette({ name, x, y, z, scale, material, flameMaterial = material }) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.scale.setScalar(scale);

  const add = (geometry, label, position, itemMaterial = material) => {
    const item = new THREE.Mesh(geometry, itemMaterial);
    item.name = `${name} ${label}`;
    item.position.set(...position);
    group.add(item);
    return item;
  };
  const body = add(new THREE.SphereGeometry(0.4, 16, 10), "body", [0, 0, 0]);
  body.scale.set(1.25, 0.72, 0.18);
  add(new THREE.SphereGeometry(0.25, 14, 10), "head", [0.66, 0.23, 0]);
  silhouetteCylinder(group, [0.32, 0.1, 0], [0.58, 0.2, 0], 0.14, material, `${name} neck`);
  const leftWingShape = new THREE.Shape().moveTo(-0.18, 0.18).lineTo(-0.75, 0.88).lineTo(0.02, 0.52).lineTo(-0.18, 0.18);
  const rightWingShape = new THREE.Shape().moveTo(0.08, 0.2).lineTo(0.42, 0.92).lineTo(0.5, 0.34).lineTo(0.08, 0.2);
  add(new THREE.ShapeGeometry(leftWingShape), "left wing", [0, 0, 0.02]);
  add(new THREE.ShapeGeometry(rightWingShape), "right wing", [0, 0, 0.02]);
  silhouetteCylinder(group, [-0.36, -0.05, 0], [-0.78, -0.28, 0], 0.11, material, `${name} tail base`);
  silhouetteCylinder(group, [-0.78, -0.28, 0], [-1.08, -0.08, 0], 0.075, material, `${name} curling tail`);
  silhouetteCylinder(group, [-0.18, -0.2, 0], [-0.38, -0.7, 0], 0.08, material, `${name} left leg`);
  silhouetteCylinder(group, [0.2, -0.2, 0], [0.42, -0.68, 0], 0.08, material, `${name} right leg`);
  const flameShape = new THREE.Shape().moveTo(0.83, 0.27).lineTo(1.2, 0.5).lineTo(1.08, 0.27).lineTo(1.45, 0.12).lineTo(1.02, 0.08).lineTo(0.83, 0.27);
  add(new THREE.ShapeGeometry(flameShape), "fire breath", [0, 0, 0.03], flameMaterial);
  scene.add(group);
  return group;
}

// A geological cutaway: the front stays open for classroom camera views.
// Seeded variation makes the exported asset reproducible.
let rockSeed = 514;
function random() { rockSeed = (1664525 * rockSeed + 1013904223) >>> 0; return rockSeed / 4294967296; }
function weatheredRock(name, position, scale, light = false) {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(vertices, i);
    // Position-based displacement keeps duplicate triangle vertices together.
    const r = 1 + 0.09 * Math.sin(v.x * 12 + v.y * 7 + v.z * 9);
    vertices.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  geometry.computeVertexNormals();
  const rock = mesh(geometry, light ? materials.rockLight : materials.rock, name, position);
  rock.scale.set(...scale);
  rock.rotation.set(random() * .3, random() * .6, random() * .25);
  return rock;
}
mesh(new THREE.BoxGeometry(14.8, 0.42, 6.8), materials.floor, "Cave floor", [-1.1, 0, 0]);
mesh(new THREE.BoxGeometry(14.8, 5.2, 0.46), materials.rock, "Cave back wall", [-1.1, 2.55, -3.35]);
for (let row = 0; row < 4; row++) {
  for (let i = 0; i < 12; i++) {
    weatheredRock("Stratified limestone", [-8 + i * 1.2, .65 + row * 1.3, -3.4],
      [.8 + random() * .25, .8 + random() * .2, .38 + random() * .2], row % 2 === 0);
  }
}
for (let i = 0; i < 8; i++) {
  weatheredRock("Cutaway cave edge", [-8.5, .7 + (i % 4) * 1.3, -2.4 + Math.floor(i / 4) * 2.6], [.65, .9, 1.4]);
}
for (let i = 0; i < 14; i++) {
  weatheredRock("Overhanging limestone roof", [-7.8 + i * .96, 5.25 + Math.sin(i) * .12, -2.3], [1, .52, 1.05], i % 2 === 0);
  if (i % 2 === 0) {
    mesh(new THREE.ConeGeometry(.14 + random() * .12, .45 + random() * .5, 7), materials.rockLight,
      "Ceiling stalactite", [-7.8 + i * .96, 4.62, -2.3], [Math.PI, 0, 0]);
  }
}
for (let i = 0; i < 24; i++) {
  weatheredRock("Loose cave scree", [-8 + random() * 13.5, .26, 1.9 + random() * 1.1],
    [.08 + random() * .22, .06 + random() * .14, .1 + random() * .2], i % 3 === 0);
}

// Shadow wall and three friends enjoying the silhouettes.
mesh(new THREE.BoxGeometry(5.6, 3.65, 0.2), materials.shadowWall, "Shadow wall", [-5.35, 2.03, -2.9]);
mesh(new THREE.PlaneGeometry(5.0, 3.2), materials.projectionGlow, "Lantern projection glow", [-5.35, 2.05, -2.83]);
knightSilhouette({ name: "Projected knight shadow", x: -6.35, y: 2.15, z: -2.8, scale: 1.05, material: materials.projectedShadow });
dragonSilhouette({ name: "Projected fire-breathing dragon shadow", x: -4.45, y: 2.15, z: -2.79, scale: 0.9, material: materials.projectedShadow });
const observers = [];
for (const [index, x] of [-6.25, -5.15, -4.05].entries()) {
  observers.push(person({ name: `Curious friend ${index + 1}`, x, y: -0.08, z: 0.7, clothing: materials.friend, seated: true, facing: Math.PI }));
}

// The shadow artists reveal how a small light and simple shapes make the show.
const shadowArtists = [
  person({ name: "Shadow artist one", x: -1.55, z: -0.9, clothing: materials.guide, armsUp: true, facing: 0.08 }),
  person({ name: "Shadow artist two", x: -0.25, z: -0.95, clothing: materials.guide, armsUp: true, facing: -0.12 }),
];
cylinderBetween([-1.55, 1.82, -0.85], [-1.55, 2.72, -0.85], 0.035, materials.wood, "Knight projection wand");
knightSilhouette({ name: "Knight cutout held by artist", x: -1.55, y: 3.05, z: -0.85, scale: 0.42, material: materials.truth });
cylinderBetween([-0.25, 1.82, -0.85], [-0.25, 2.68, -0.85], 0.035, materials.wood, "Dragon projection wand");
dragonSilhouette({ name: "Dragon cutout held by artist", x: -0.25, y: 3.0, z: -0.85, scale: 0.38, material: materials.truth, flameMaterial: materials.flame });
const lanternLight = new THREE.PointLight(0xffb84d, 7, 8, 2);
lanternLight.name = "Story lantern light";
lanternLight.position.set(1.4, 1.15, -0.1);
scene.add(lanternLight);

// A hearth, rather than modern ceiling lamps, supplies the cave's warm light.
for (let i = 0; i < 10; i++) {
  const angle = i * Math.PI * 2 / 10;
  weatheredRock("Hearth stone", [1.4 + Math.cos(angle) * .65, .32, -.25 + Math.sin(angle) * .65], [.24, .16, .2], true);
}
for (let i = 0; i < 4; i++) {
  const angle = i * Math.PI / 4;
  cylinderBetween([1.4 - Math.cos(angle) * .48, .38, -.25 - Math.sin(angle) * .48],
    [1.4 + Math.cos(angle) * .48, .38, -.25 + Math.sin(angle) * .48], .09, materials.wood, "Charred hearth log");
}
for (let i = 0; i < 7; i++) {
  const flame = mesh(new THREE.ConeGeometry(.13, .55 + random() * .45, 9),
    i % 2 ? materials.flame : materials.flameCore, "Hearth flame",
    [1.4 + (random() - .5) * .45, .72, -.25 + (random() - .5) * .4]);
  flame.rotation.z = (random() - .5) * .35;
}
// Low stone screen: the carried figures rise above it.
mesh(new THREE.BoxGeometry(2.7, 1.15, .35), materials.rockLight, "Puppet screen", [-.9, .79, -.48]);

// The ascent — individual steps make the difficult reorientation visible.
for (let i = 0; i < 7; i += 1) {
  mesh(new THREE.BoxGeometry(1.0, 0.32 + i * 0.32, 2.4), materials.path, `Ascent step ${i + 1}`, [2.4 + i * 0.72, 0.18 + i * 0.16, 0]);
}
const pathFriend = person({ name: "Curious friend following the path", x: 4.55, y: 1.25, z: 0.1, clothing: materials.guide, facing: -0.4 });

// Outside world and the sun / Form of the Good.
mesh(new THREE.BoxGeometry(5.8, 0.5, 6.8), materials.grass, "World outside the cave", [7.4, 2.62, 0]);
const gardenFriend = person({ name: "Curious friend discovering daylight", x: 7.0, y: 2.92, z: 0.5, clothing: materials.truth, armsUp: true });
cylinderBetween([8.5, 2.87, -0.8], [8.5, 4.45, -0.8], 0.18, materials.wood, "Tree trunk");
for (const offset of [[0, 0, 0], [-0.45, -0.05, 0], [0.42, 0.04, 0.08], [0, 0.45, -0.05]]) {
  const crown = mesh(new THREE.IcosahedronGeometry(0.72, 1), materials.leaf, "Tree crown", [8.5 + offset[0], 4.75 + offset[1], -0.8 + offset[2]]);
  crown.scale.set(1.15, 0.9, 1.05);
}
const water = new THREE.MeshStandardMaterial({ color: 0x65acb5, metalness: .25, roughness: .2 });
water.name = "Daylight reflection pool";
const pool = mesh(new THREE.CylinderGeometry(.9, .9, .045, 40), water, "Reflecting pool", [8, 2.9, 1.55]);
pool.scale.set(1.45, 1, .8);
for (let i = 0; i < 18; i++) {
  const angle = i * Math.PI * 2 / 18;
  weatheredRock("Pool shore pebble", [8 + Math.cos(angle) * 1.4, 2.92, 1.55 + Math.sin(angle) * .78], [.16, .09, .12], true);
}
for (const side of [-1, 1]) {
  cylinderBetween([8.5, 3.65, -.8], [8.5 + side * .5, 4.5, -.8], .08, materials.wood, "Tree branch");
}
for (let i = 0; i < 35; i++) {
  const x = 5.5 + random() * 4.5, z = -2.6 + random() * 5;
  if (Math.abs(z) < .65 || (x > 6.5 && z > .7)) continue;
  mesh(new THREE.ConeGeometry(.06, .22 + random() * .2, 4), materials.leaf, "Garden grass", [x, 2.99, z]);
}

mesh(new THREE.SphereGeometry(0.82, 24, 16), materials.sun, "Sun — source of understanding", [9.15, 7.15, -1.5]);
for (let i = 0; i < 12; i += 1) {
  const angle = (i / 12) * Math.PI * 2;
  cylinderBetween(
    [9.15 + Math.cos(angle) * 1.05, 7.15 + Math.sin(angle) * 1.05, -1.5],
    [9.15 + Math.cos(angle) * 1.48, 7.15 + Math.sin(angle) * 1.48, -1.5],
    0.045,
    materials.sun,
    "Sun ray",
    8
  );
}
// A visible gold trail ties the zones together without requiring text inside
// the 3D asset; the lesson controls supply the vocabulary and explanations.
for (let i = 0; i < 12; i += 1) {
  const x = -3 + i * 0.88;
  const y = x > 2 ? 0.24 + (x - 2) * 0.35 : 0.24;
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 16), materials.truth, "Path toward truth", [x, y, 2.25], [Math.PI / 2, 0, 0]);
}

// A slightly stiff, pose-to-pose idle loop evokes playful ragdoll machinima.
const clipTimes = [0, 0.7, 1.4, 2.1, 2.8];
function poseTrack(object, angles, axis = new THREE.Vector3(0, 0, 1)) {
  const values = [];
  const base = object.quaternion.clone();
  for (const angle of angles) {
    const pose = base.clone().multiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
    values.push(pose.x, pose.y, pose.z, pose.w);
  }
  return new THREE.QuaternionKeyframeTrack(`${object.name}.quaternion`, clipTimes, values, THREE.InterpolateDiscrete);
}

const machinimaTracks = [
  poseTrack(observers[0], [0, 0.025, 0, -0.018, 0]),
  poseTrack(observers[1], [0, -0.02, 0.03, 0, 0]),
  poseTrack(observers[2], [0, 0.018, -0.025, 0.012, 0]),
  poseTrack(shadowArtists[0], [0, 0.07, -0.035, 0.05, 0]),
  poseTrack(shadowArtists[1], [0, -0.06, 0.045, -0.025, 0]),
  poseTrack(pathFriend, [0, 0.045, -0.02, 0.035, 0]),
  poseTrack(gardenFriend, [0, -0.04, 0.05, -0.02, 0]),
];
const machinimaIdle = new THREE.AnimationClip("Machinima Idle", 2.8, machinimaTracks);

const exporter = new GLTFExporter();
const arrayBuffer = await new Promise((resolve, reject) => {
  exporter.parse(scene, resolve, reject, {
    binary: true,
    onlyVisible: true,
    truncateDrawRange: true,
    maxTextureSize: 1024,
    animations: [machinimaIdle],
  });
});

const textureAssignments = {
  "plato-rock": "cave-rock.jpg",
  "plato-rockLight": "cave-rock.jpg",
  "plato-floor": "cave-floor.jpg",
  "plato-shadowWall": "plaster-wall.jpg",
  "plato-friend": "blue-linen.jpg",
  "plato-guide": "terracotta-linen.jpg",
  "plato-cushion": "tan-fabric.jpg",
  "plato-wood": "walnut.jpg",
  "plato-path": "cave-rock.jpg",
  "plato-grass": "grass.jpg",
  "plato-leaf": "grass.jpg",
};

const io = new NodeIO().registerExtensions([
  KHRLightsPunctual,
  KHRMaterialsEmissiveStrength,
  KHRMaterialsUnlit,
]);
const document = await io.readBinary(new Uint8Array(arrayBuffer));
const textureCache = new Map();
for (const material of document.getRoot().listMaterials()) {
  const filename = textureAssignments[material.getName()];
  if (!filename) continue;
  let texture = textureCache.get(filename);
  if (!texture) {
    const image = await fs.readFile(path.join(ROOT, "assets", "textures", "plato-cave", filename));
    texture = document.createTexture(filename).setImage(image).setMimeType("image/jpeg");
    textureCache.set(filename, texture);
  }
  material.setBaseColorTexture(texture);
  const textureInfo = material.getBaseColorTextureInfo();
  if (textureInfo) textureInfo.setWrapS(10497).setWrapT(10497);
}

const texturedGlb = await io.writeBinary(document);
await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, texturedGlb);
console.log(`Wrote ${path.relative(ROOT, OUTPUT)} (${(texturedGlb.byteLength / 1024).toFixed(1)} KiB, UV-textured)`);
