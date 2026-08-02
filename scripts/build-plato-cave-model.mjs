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
scene.name = "Plato Cave Machinima Fable";

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

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.7, 4, 10), clothing);
  torso.name = `${name} torso`;
  torso.position.y = seated ? 1.05 : 1.38;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), materials.skin);
  head.name = `${name} head`;
  head.position.y = seated ? 1.82 : 2.18;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.247, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), materials.wood);
  hair.name = `${name} hair`;
  hair.position.y = (seated ? 1.82 : 2.18) + 0.03;
  group.add(hair);

  const faceY = seated ? 1.82 : 2.18;
  for (const eyeX of [-0.085, 0.085]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.027, 10, 8), materials.shadow);
    eye.name = `${name} eye`;
    eye.position.set(eyeX, faceY + 0.025, 0.226);
    group.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.018), materials.shadow);
  mouth.name = `${name} mouth`;
  mouth.position.set(0, faceY - 0.085, 0.235);
  group.add(mouth);

  const limb = (a, b, r, label, material = materials.skin) => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const part = new THREE.Mesh(new THREE.CylinderGeometry(r, r, delta.length(), 10), material);
    part.name = `${name} ${label}`;
    part.position.copy(start).add(end).multiplyScalar(0.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    group.add(part);
  };

  const joint = (position, radius, label, material = materials.skin) => {
    const part = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), material);
    part.name = `${name} ${label}`;
    part.position.set(...position);
    group.add(part);
  };

  if (seated) {
    limb([-0.2, 1.5, 0], [-0.38, 1.04, 0.06], 0.09, "left upper arm", clothing);
    limb([-0.38, 1.04, 0.06], [-0.44, 0.58, 0.16], 0.075, "left forearm");
    limb([0.2, 1.5, 0], [0.38, 1.04, 0.06], 0.09, "right upper arm", clothing);
    limb([0.38, 1.04, 0.06], [0.44, 0.58, 0.16], 0.075, "right forearm");
    joint([-0.38, 1.04, 0.06], 0.095, "left elbow");
    joint([0.38, 1.04, 0.06], 0.095, "right elbow");
    limb([-0.13, 0.84, 0], [-0.48, 0.42, 0.2], 0.125, "left thigh", clothing);
    limb([-0.48, 0.42, 0.2], [0.16, 0.2, 0.3], 0.1, "left crossed shin", clothing);
    limb([0.13, 0.84, 0], [0.48, 0.42, 0.2], 0.125, "right thigh", clothing);
    limb([0.48, 0.42, 0.2], [-0.16, 0.2, 0.34], 0.1, "right crossed shin", clothing);
    joint([-0.48, 0.42, 0.2], 0.13, "left knee", clothing);
    joint([0.48, 0.42, 0.2], 0.13, "right knee", clothing);
    for (const [index, hand] of [[-0.44, 0.58, 0.16], [0.44, 0.58, 0.16]].entries()) {
      const handMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), materials.skin);
      handMesh.name = `${name} resting hand ${index + 1}`;
      handMesh.position.set(...hand);
      group.add(handMesh);
    }
  } else {
    const handY = armsUp ? 1.9 : 1.18;
    const elbowY = armsUp ? 1.72 : 1.34;
    limb([-0.2, 1.66, 0], [-0.4, elbowY, 0.03], 0.09, "left upper arm", clothing);
    limb([-0.4, elbowY, 0.03], [-0.58, handY, 0.08], 0.075, "left forearm");
    limb([0.2, 1.66, 0], [0.4, elbowY, 0.03], 0.09, "right upper arm", clothing);
    limb([0.4, elbowY, 0.03], [0.58, handY, 0.08], 0.075, "right forearm");
    joint([-0.4, elbowY, 0.03], 0.095, "left elbow");
    joint([0.4, elbowY, 0.03], 0.095, "right elbow");
    joint([-0.58, handY, 0.08], 0.1, "left hand");
    joint([0.58, handY, 0.08], 0.1, "right hand");
    limb([-0.12, 0.98, 0], [-0.16, 0.53, 0.02], 0.12, "left thigh", clothing);
    limb([-0.16, 0.53, 0.02], [-0.2, 0.08, 0.05], 0.105, "left shin", clothing);
    limb([0.12, 0.98, 0], [0.16, 0.53, 0.02], 0.12, "right thigh", clothing);
    limb([0.16, 0.53, 0.02], [0.2, 0.08, 0.05], 0.105, "right shin", clothing);
    joint([-0.16, 0.53, 0.02], 0.12, "left knee", clothing);
    joint([0.16, 0.53, 0.02], 0.12, "right knee", clothing);
    joint([-0.2, 0.08, 0.12], 0.13, "left shoe", materials.wood);
    joint([0.2, 0.08, 0.12], 0.13, "right shoe", materials.wood);
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

// Cave shell — open at the front so the fable's journey remains readable.
mesh(new THREE.BoxGeometry(14.8, 0.42, 6.8), materials.floor, "Cave floor", [-1.1, 0, 0]);
mesh(new THREE.BoxGeometry(14.8, 5.2, 0.46), materials.rock, "Cave back wall", [-1.1, 2.55, -3.15]);
mesh(new THREE.BoxGeometry(0.5, 5.3, 6.8), materials.rockLight, "Cave left wall", [-8.5, 2.6, 0]);
for (let i = 0; i < 13; i += 1) {
  const x = -7.8 + i * 1.02;
  const y = 5.2 + Math.sin(i * 1.7) * 0.18;
  const rock = mesh(new THREE.DodecahedronGeometry(0.85 + (i % 3) * 0.13, 1), i % 2 ? materials.rock : materials.rockLight, "Weathered cave roof", [x, y, -1.7 + (i % 2) * 1.6]);
  rock.scale.set(1.15, 0.72, 1.45);
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
mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.25, 16), materials.wood, "Story lantern base", [1.4, 0.38, -0.25]);
mesh(new THREE.CapsuleGeometry(0.28, 0.62, 5, 14), materials.flameCore, "Story lantern glow", [1.4, 1.02, -0.25]);
mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.2, 16), materials.wood, "Story lantern cap", [1.4, 1.52, -0.25]);
mesh(new THREE.TorusGeometry(0.46, 0.045, 8, 20, Math.PI), materials.wood, "Story lantern handle", [1.4, 1.55, -0.25]);
const lanternLight = new THREE.PointLight(0xffb84d, 7, 8, 2);
lanternLight.name = "Story lantern light";
lanternLight.position.set(1.4, 1.15, -0.1);
scene.add(lanternLight);

// Chunky practical fixtures give the cave a playful machinima-set feeling.
for (const [index, x] of [-5.2, -1.2, 3.1].entries()) {
  mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 12), materials.metal, `Ceiling lamp housing ${index + 1}`, [x, 4.72, 1.55]);
  mesh(new THREE.ConeGeometry(0.46, 0.42, 14, 1, true), materials.metal, `Ceiling lamp shade ${index + 1}`, [x, 4.42, 1.55], [Math.PI, 0, 0]);
  mesh(new THREE.SphereGeometry(0.16, 16, 10), materials.flameCore, `Ceiling lamp bulb ${index + 1}`, [x, 4.22, 1.55]);
  const practical = new THREE.PointLight(0xffd3a0, 1.8, 5.5, 2);
  practical.name = `Warm set light ${index + 1}`;
  practical.position.set(x, 4.18, 1.55);
  scene.add(practical);
}

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
  material.setBaseColorFactor([1, 1, 1, 1]).setBaseColorTexture(texture);
  const textureInfo = material.getBaseColorTextureInfo();
  if (textureInfo) textureInfo.setWrapS(10497).setWrapT(10497);
}

const texturedGlb = await io.writeBinary(document);
await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, texturedGlb);
console.log(`Wrote ${path.relative(ROOT, OUTPUT)} (${(texturedGlb.byteLength / 1024).toFixed(1)} KiB, UV-textured)`);
