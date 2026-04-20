// Virtual Reality Museum Viewer Script
// Loads models from museum-models.json and renders them at consistent human scale in A-Frame.

const MODELS_DATA_URL = "/data/museum-models.json";
const GRID_COLS = 3;
const GRID_SPACING = 4;          // meters between model centers
const TARGET_HEIGHT = 1.0;       // normalize every model to ~1m tall
const PEDESTAL_HEIGHT = 0.4;     // pedestal rises 0.4m off the ground
const PEDESTAL_RADIUS = 0.55;
const LABEL_HEIGHT_OFFSET = 0.35;

const scene = document.querySelector("a-scene");
const modelContainer = document.getElementById("model-container");
const infoPanel = document.getElementById("info-panel");
const infoPanelTitle = document.getElementById("model-title");
const infoPanelStudent = document.getElementById("model-student");
const infoPanelDescription = document.getElementById("model-description");
const infoPanelType = document.getElementById("model-type");
const loadingIndicator = document.getElementById("loading");
const emptyMuseum = document.getElementById("empty-museum");
const vrToggleBtn = document.getElementById("vr-toggle");

let models = [];
let currentSelectedEntity = null;

const artifactLabels = {
  artifact: "🏺 Artifact",
  landmark: "🏛️ Landmark",
  animal: "🦖 Animal",
  other: "✨ Other",
};

// Register a simple billboard component so labels always face the camera.
if (!AFRAME.components.billboard) {
  AFRAME.registerComponent("billboard", {
    tick() {
      const cam = scene.camera;
      if (!cam) return;
      this.el.object3D.lookAt(cam.getWorldPosition(new THREE.Vector3()));
    },
  });
}

async function loadModels() {
  try {
    const response = await fetch(MODELS_DATA_URL);
    if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
    const data = await response.json();
    models = data.models || [];
    loadingIndicator.style.display = "none";

    if (models.length === 0) {
      emptyMuseum.style.display = "block";
      return;
    }
    renderModels();
  } catch (err) {
    console.error("Error loading models:", err);
    loadingIndicator.innerHTML = `<div class="error"><h2>Error Loading Museum</h2><p>${err.message}</p></div>`;
  }
}

function gridPosition(index) {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  const x = col * GRID_SPACING - ((GRID_COLS - 1) * GRID_SPACING) / 2;
  const z = -row * GRID_SPACING;
  return { x, z };
}

function renderModels() {
  while (modelContainer.children.length > 0) {
    modelContainer.removeChild(modelContainer.children[0]);
  }

  models.forEach((model, index) => {
    const { x, z } = gridPosition(index);

    // Wrapper at grid position.
    const wrapper = document.createElement("a-entity");
    wrapper.setAttribute("position", `${x} 0 ${z}`);
    wrapper.setAttribute("class", "model-wrapper");

    // Pedestal: a short cylinder that the artifact rests on.
    const pedestal = document.createElement("a-cylinder");
    pedestal.setAttribute("position", `0 ${PEDESTAL_HEIGHT / 2} 0`);
    pedestal.setAttribute("radius", PEDESTAL_RADIUS);
    pedestal.setAttribute("height", PEDESTAL_HEIGHT);
    pedestal.setAttribute("color", "#3b4252");
    pedestal.setAttribute("material", "roughness: 0.4; metalness: 0.2");
    pedestal.setAttribute("shadow", "cast: true; receive: true");
    wrapper.appendChild(pedestal);

    // Thin plaque on the pedestal front showing the title.
    const plaque = document.createElement("a-entity");
    plaque.setAttribute("position", `0 ${PEDESTAL_HEIGHT * 0.55} ${PEDESTAL_RADIUS + 0.005}`);
    plaque.setAttribute("geometry", "primitive: plane; width: 0.7; height: 0.18");
    plaque.setAttribute("material", "color: #1f2937; opacity: 0.9");
    const plaqueText = document.createElement("a-entity");
    plaqueText.setAttribute("position", "0 0 0.01");
    plaqueText.setAttribute(
      "text",
      `value: ${model.title}\nby ${model.student}; align: center; width: 0.95; color: #f9fafb; baseline: center; anchor: center; wrapCount: 22`
    );
    plaque.appendChild(plaqueText);
    wrapper.appendChild(plaque);

    // GLTF model — positioned on top of the pedestal. Real scale set after load.
    const modelEntity = document.createElement("a-gltf-model");
    modelEntity.setAttribute("id", `model-${model.id}`);
    modelEntity.setAttribute("src", model.file);
    modelEntity.setAttribute("position", `0 ${PEDESTAL_HEIGHT} 0`);
    modelEntity.setAttribute("scale", "0.01 0.01 0.01"); // start tiny; replaced on load
    modelEntity.setAttribute("shadow", "cast: true; receive: false");
    modelEntity.setAttribute("class", "museum-model clickable");

    // Once the GLB loads, measure its bounding box and normalize scale.
    modelEntity.addEventListener("model-loaded", () => {
      fitModelToHeight(modelEntity, model, wrapper);
    });
    modelEntity.addEventListener("model-error", (e) => {
      console.warn("Model failed:", model.id, e.detail);
    });

    modelEntity.addEventListener("click", (e) => {
      e.stopPropagation();
      selectModel(model, modelEntity);
    });

    wrapper.appendChild(modelEntity);

    // Hovering billboard label above the model.
    const label = document.createElement("a-entity");
    label.setAttribute("class", "model-label");
    label.setAttribute("position", `0 ${PEDESTAL_HEIGHT + TARGET_HEIGHT + LABEL_HEIGHT_OFFSET} 0`);
    label.setAttribute("billboard", "");
    const labelBg = document.createElement("a-entity");
    labelBg.setAttribute("geometry", "primitive: plane; width: 0.9; height: 0.18");
    labelBg.setAttribute("material", "color: #111827; opacity: 0.85");
    const labelText = document.createElement("a-entity");
    labelText.setAttribute("position", "0 0 0.01");
    labelText.setAttribute(
      "text",
      `value: ${artifactLabels[model.artifact_type] || "✨"} ${model.title}; align: center; width: 1.2; color: #fff; baseline: center; anchor: center; wrapCount: 26`
    );
    labelBg.appendChild(labelText);
    label.appendChild(labelBg);
    wrapper.appendChild(label);

    modelContainer.appendChild(wrapper);
  });
}

// Measure the loaded mesh, compute a uniform scale so the model is TARGET_HEIGHT tall,
// and recenter it horizontally above the pedestal.
function fitModelToHeight(modelEntity, model, wrapper) {
  const mesh = modelEntity.getObject3D("mesh");
  if (!mesh) return;

  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const currentHeight = size.y || 1;
  const scale = TARGET_HEIGHT / currentHeight;

  // Respect optional per-model multiplier to under/over-size special items (e.g. a truly large monument).
  const multiplier = typeof model.scaleMultiplier === "number" ? model.scaleMultiplier : 1;
  const finalScale = scale * multiplier;

  modelEntity.setAttribute("scale", `${finalScale} ${finalScale} ${finalScale}`);

  // After scaling, recenter so the model sits centered on the pedestal with its base at pedestal top.
  const newBox = new THREE.Box3().setFromObject(mesh);
  const newMin = newBox.min;
  const newCenter = new THREE.Vector3();
  newBox.getCenter(newCenter);
  const offsetX = -newCenter.x;
  const offsetZ = -newCenter.z;
  const offsetY = PEDESTAL_HEIGHT - newMin.y;
  modelEntity.setAttribute("position", `${offsetX} ${offsetY} ${offsetZ}`);
}

function selectModel(model, entity) {
  if (currentSelectedEntity) currentSelectedEntity.classList.remove("model-selected");
  currentSelectedEntity = entity;
  entity.classList.add("model-selected");

  infoPanelTitle.textContent = model.title;
  infoPanelStudent.textContent = `by ${model.student}`;
  infoPanelDescription.textContent = model.description;
  infoPanelType.textContent = artifactLabels[model.artifact_type] || "✨ Object";
  infoPanel.classList.add("show");
}

function closeInfoPanel() {
  infoPanel.classList.remove("show");
  if (currentSelectedEntity) {
    currentSelectedEntity.classList.remove("model-selected");
    currentSelectedEntity = null;
  }
}

// VR toggle (clicks A-Frame's built-in enter-VR button).
vrToggleBtn.addEventListener("click", () => {
  const vrButton = document.querySelector(".a-enter-vr-button");
  if (vrButton) vrButton.click();
});

// Close info panel when clicking empty scene area.
document.addEventListener("click", (e) => {
  if (e.target.closest(".museum-model") || e.target.closest("#info-panel")) return;
  closeInfoPanel();
});

// Keyboard shortcuts.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeInfoPanel();
  if (e.key === "r" || e.key === "R") {
    const cameraEntity = document.querySelector("a-camera");
    cameraEntity.setAttribute("position", "0 1.6 8");
    cameraEntity.setAttribute("rotation", "0 0 0");
  }
});

// Initialize.
if (scene.hasLoaded) loadModels();
else scene.addEventListener("loaded", loadModels);

console.log("Museum Viewer initialized");
