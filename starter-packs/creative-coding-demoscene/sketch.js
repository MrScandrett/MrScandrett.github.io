"use strict";

// SIGNAL GARDEN — THREE SMALL REAL-TIME ART SYSTEMS
// Read README-FIRST.md and search for WHAT, WHY, MATH, and TRY THIS.

const canvas = document.querySelector("#art");
const ctx = canvas.getContext("2d");
const sceneControl = document.querySelector("#scene");
const energyControl = document.querySelector("#energy");
const complexityControl = document.querySelector("#complexity");
const paletteControl = document.querySelector("#palette");
const description = document.querySelector("#description");

// WHAT: A palette is a limited set of intentional color relationships.
// TRY THIS: Replace one palette with colors sampled from a painting or photograph.
const PALETTES = {
  aurora: ["#72f1ce", "#5b8cff", "#c77dff", "#f8f7ff"],
  sunset: ["#ff5d8f", "#ff9f5b", "#ffe66d", "#7bdff2"],
  mono: ["#ffffff", "#cbd5e1", "#64748b", "#e2e8f0"]
};

let width = 0;
let height = 0;
let paused = false;
let elapsed = 0;
let previous = performance.now();
let seed = Math.random() * 10000;
let particles = [];

function resizeCanvas() {
  // WHY: Drawing at device pixel ratio prevents blurry lines on high-DPI screens.
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  makeParticles();
}

function hash(x, y) {
  // MATH: This deterministic hash returns the same pseudo-random value for a grid point.
  const value = Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453;
  return value - Math.floor(value);
}

function smoothstep(t) { return t * t * (3 - 2 * t); }

function valueNoise(x, y) {
  // MATH: Bilinear interpolation blends the four surrounding grid values.
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const tx = smoothstep(x - x0), ty = smoothstep(y - y0);
  const top = hash(x0, y0) * (1 - tx) + hash(x0 + 1, y0) * tx;
  const bottom = hash(x0, y0 + 1) * (1 - tx) + hash(x0 + 1, y0 + 1) * tx;
  return top * (1 - ty) + bottom * ty;
}

function makeParticles() {
  const count = Math.round(180 + Number(complexityControl.value) * 55);
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    age: Math.random() * 200
  }));
}

function background(alpha = 1) {
  ctx.fillStyle = `rgba(2, 6, 13, ${alpha})`;
  ctx.fillRect(0, 0, width, height);
}

function drawFlow(dt, colors, energy, complexity) {
  // WHY: A translucent background preserves short trails between frames.
  background(0.08);
  ctx.lineWidth = 1.2;
  particles.forEach((particle, index) => {
    const oldX = particle.x, oldY = particle.y;
    const scale = 0.0025 + complexity * 0.00018;
    const angle = valueNoise(particle.x * scale, particle.y * scale) * Math.PI * 5 + elapsed * 0.08;
    particle.x += Math.cos(angle) * 70 * energy * dt;
    particle.y += Math.sin(angle) * 70 * energy * dt;
    particle.age += 1;
    if (particle.x < 0 || particle.x > width || particle.y < 0 || particle.y > height || particle.age > 500) {
      particle.x = Math.random() * width;
      particle.y = Math.random() * height;
      particle.age = 0;
      return;
    }
    ctx.strokeStyle = colors[index % colors.length] + "88";
    ctx.beginPath(); ctx.moveTo(oldX, oldY); ctx.lineTo(particle.x, particle.y); ctx.stroke();
  });
}

function drawWaves(_dt, colors, energy, complexity) {
  background(1);
  const layers = 3 + complexity;
  for (let layer = 0; layer < layers; layer += 1) {
    const centerY = height * (layer + 1) / (layers + 1);
    const frequency = 0.008 + layer * 0.0018;
    const amplitude = (18 + layer * 3) * energy;
    ctx.strokeStyle = colors[layer % colors.length] + "bb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 4) {
      // MATH: Adding sine waves with related frequencies is Fourier-style synthesis.
      const y = centerY +
        Math.sin(x * frequency + elapsed * (0.8 + layer * 0.08)) * amplitude +
        Math.sin(x * frequency * 2.01 - elapsed * 0.55) * amplitude * 0.32;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawStars(_dt, colors, energy, complexity) {
  background(0.32);
  const count = 80 + complexity * 35;
  const cx = width / 2, cy = height / 2;
  for (let i = 0; i < count; i += 1) {
    // MATH: Modulo wraps time so each star repeatedly travels from center to edge.
    const progress = (i / count + elapsed * 0.06 * energy) % 1;
    const angle = i * 2.39996 + seed;
    const radius = progress * progress * Math.max(width, height) * 0.72;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const size = 0.7 + progress * 4;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y, size, size);
  }
}

const scenes = { flow: drawFlow, waves: drawWaves, stars: drawStars };
const sceneDescriptions = {
  flow: "Particles follow a smooth-noise vector field.",
  waves: "Related sine waves combine into a moving visual chord.",
  stars: "Time and polar coordinates create a compact tunnel illusion."
};

function frame(now) {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  if (!paused) elapsed += dt;
  const scene = sceneControl.value;
  scenes[scene](paused ? 0 : dt, PALETTES[paletteControl.value], Number(energyControl.value), Number(complexityControl.value));
  requestAnimationFrame(frame);
}

function chooseScene(name) {
  sceneControl.value = name;
  description.textContent = sceneDescriptions[name];
  background(1);
}

sceneControl.addEventListener("change", () => chooseScene(sceneControl.value));
complexityControl.addEventListener("input", makeParticles);
document.querySelector("#pause").addEventListener("click", (event) => {
  paused = !paused;
  event.currentTarget.textContent = paused ? "Resume" : "Pause";
});
document.querySelector("#seed").addEventListener("click", () => { seed = Math.random() * 10000; makeParticles(); background(1); });
document.querySelector("#export").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `signal-garden-${sceneControl.value}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") document.querySelector("#pause").click();
  if (event.code === "KeyN") document.querySelector("#seed").click();
  if (["Digit1", "Digit2", "Digit3"].includes(event.code)) chooseScene(["flow", "waves", "stars"][Number(event.code.at(-1)) - 1]);
});
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(frame);
