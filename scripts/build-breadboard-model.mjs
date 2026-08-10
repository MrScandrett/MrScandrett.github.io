#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "assets", "models", "breadboard-cutaway.glb");

globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.({ target: this });
    });
  }
};

const scene = new THREE.Scene();
scene.name = "Breadboard exploded cutaway";

const materials = {
  plastic: new THREE.MeshStandardMaterial({ color: 0xf5f1dc, roughness: 0.72 }),
  edge: new THREE.MeshStandardMaterial({ color: 0xd9d3b9, roughness: 0.8 }),
  hole: new THREE.MeshStandardMaterial({ color: 0x243041, roughness: 0.42, metalness: 0.12 }),
  channel: new THREE.MeshStandardMaterial({ color: 0xc8c2a8, roughness: 0.84 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xd29a32, roughness: 0.3, metalness: 0.78 }),
  metalDark: new THREE.MeshStandardMaterial({ color: 0xa86f1d, roughness: 0.38, metalness: 0.72 }),
  red: new THREE.MeshStandardMaterial({ color: 0xe44238, roughness: 0.58 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x2879d8, roughness: 0.58 }),
};

for (const [name, material] of Object.entries(materials)) material.name = `breadboard-${name}`;

function add(geometry, material, name, position, parent = scene) {
  const item = new THREE.Mesh(geometry, material);
  item.name = name;
  item.position.set(...position);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

const board = new THREE.Group();
board.name = "Plastic shell and sockets";
scene.add(board);

// The plastic shell is intentionally lifted above the clips: an exploded view
// makes connections that are normally hidden immediately visible to students.
add(new THREE.BoxGeometry(12.8, 0.52, 7.4), materials.plastic, "Solderless breadboard shell", [0, 1.35, 0], board);
add(new THREE.BoxGeometry(12.3, 0.08, 0.34), materials.channel, "Center gap", [0, 1.64, 0], board);

const columnXs = Array.from({ length: 12 }, (_, index) => -5.5 + index);
const topRows = [0.65, 1.25, 1.85, 2.45, 3.05];
const bottomRows = topRows.map((z) => -z);
const railRows = [3.35, 3.72, -3.35, -3.72];
const holeGeometry = new THREE.CylinderGeometry(0.11, 0.15, 0.075, 12);

for (const [index, z] of railRows.entries()) {
  for (const [column, x] of columnXs.entries()) {
    add(holeGeometry, materials.hole, `Rail socket ${index + 1}-${column + 1}`, [x, 1.66, z], board);
  }
}

for (const [half, rows] of [["a-e", topRows], ["f-j", bottomRows]]) {
  for (const [row, z] of rows.entries()) {
    for (const [column, x] of columnXs.entries()) {
      add(holeGeometry, materials.hole, `${half} socket row ${row + 1} column ${column + 1}`, [x, 1.66, z], board);
    }
  }
}

// Printed red/blue guides beside the power rails.
for (const [z, material, label] of [
  [3.56, materials.red, "Top positive guide"],
  [3.15, materials.blue, "Top negative guide"],
  [-3.15, materials.red, "Bottom positive guide"],
  [-3.56, materials.blue, "Bottom negative guide"],
]) {
  add(new THREE.BoxGeometry(11.6, 0.035, 0.06), material, label, [0, 1.66, z], board);
}

const clips = new THREE.Group();
clips.name = "Hidden metal connections";
scene.add(clips);

// Four long power strips: every socket along one rail shares a strip.
for (const [index, z] of railRows.entries()) {
  add(new THREE.BoxGeometry(11.35, 0.18, 0.23), index % 2 === 0 ? materials.metal : materials.metalDark,
    `Horizontal power strip ${index + 1}`, [0, 0.2, z], clips);
}

// Each column has two separate five-hole terminal clips; the center gap breaks them apart.
for (const [column, x] of columnXs.entries()) {
  add(new THREE.BoxGeometry(0.22, 0.18, 2.65), materials.metal,
    `Column ${column + 1} upper five-hole clip`, [x, 0.2, 1.85], clips);
  add(new THREE.BoxGeometry(0.22, 0.18, 2.65), materials.metal,
    `Column ${column + 1} lower five-hole clip`, [x, 0.2, -1.85], clips);
}

// Small supports clarify that the gold clips live directly below the sockets.
for (const x of [-6.05, 6.05]) {
  for (const z of [-3.3, 3.3]) {
    add(new THREE.CylinderGeometry(0.09, 0.09, 1.05, 10), materials.edge, "Exploded-view support", [x, 0.78, z], scene);
  }
}

const exporter = new GLTFExporter();
const binary = await exporter.parseAsync(scene, {
  binary: true,
  onlyVisible: true,
  trs: false,
});

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, Buffer.from(binary));
console.log(`Wrote ${path.relative(ROOT, OUTPUT)} (${Math.round(binary.byteLength / 1024)} KB)`);
