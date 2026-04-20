// Virtual Reality Museum Viewer Script
// Loads models from museum-models.json and renders them in A-Frame

const MODELS_DATA_URL = "/data/museum-models.json";
const GRID_COLS = 4;
const GRID_SPACING = 2.5;
const MODEL_MAX_HEIGHT = 2.5;

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
let currentSelectedModel = null;

// Artifact type labels with emojis
const artifactLabels = {
  artifact: "🏺 Artifact",
  landmark: "🏛️ Landmark",
  animal: "🦖 Animal",
  other: "✨ Other",
};

// Fetch museum models data
async function loadModels() {
  try {
    const response = await fetch(MODELS_DATA_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
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

// Render models in grid layout
function renderModels() {
  // Clear container
  while (modelContainer.children.length > 0) {
    modelContainer.removeChild(modelContainer.children[0]);
  }

  models.forEach((model, index) => {
    const gridX = (index % GRID_COLS) * GRID_SPACING - ((GRID_COLS - 1) * GRID_SPACING) / 2;
    const gridZ = Math.floor(index / GRID_COLS) * GRID_SPACING;

    // Create wrapper for model positioning
    const modelWrapper = document.createElement("a-entity");
    modelWrapper.setAttribute("position", `${gridX} 0 ${gridZ}`);
    modelWrapper.setAttribute("class", "model-wrapper");

    // Create model entity with GLTF loader
    const modelEntity = document.createElement("a-gltf-model");
    modelEntity.setAttribute("id", `model-${model.id}`);
    modelEntity.setAttribute("src", model.file);
    modelEntity.setAttribute("position", "0 0 0");
    modelEntity.setAttribute("scale", getModelScale(model));
    modelEntity.setAttribute("shadow", "cast: true; receive: false");

    // Add click handler for model selection
    modelEntity.addEventListener("click", (e) => {
      e.stopPropagation();
      selectModel(model, modelEntity);
    });

    // Create info label above model
    const label = document.createElement("a-entity");
    label.setAttribute("position", "0 2.8 0");
    label.setAttribute("text", `value: ${model.title}; align: center; width: 5; color: #1f2937; wrapCount: 20`);
    label.setAttribute("scale", "1 1 1");

    // Create student name below model
    const studentLabel = document.createElement("a-entity");
    studentLabel.setAttribute("position", "0 2.5 0");
    studentLabel.setAttribute("text", `value: by ${model.student}; align: center; width: 5; color: #6b7280; wrapCount: 20`);
    studentLabel.setAttribute("scale", "0.8 0.8 0.8");

    modelWrapper.appendChild(modelEntity);
    modelWrapper.appendChild(label);
    modelWrapper.appendChild(studentLabel);
    modelContainer.appendChild(modelWrapper);
  });
}

// Calculate scale to fit model within max height
function getModelScale(model) {
  // Default scale of 1
  // Models can be pre-scaled in the data if needed
  const scale = model.scale || 1;
  return `${scale} ${scale} ${scale}`;
}

// Select and display model info
function selectModel(model, entity) {
  currentSelectedModel = model;

  // Update info panel
  infoPanelTitle.textContent = model.title;
  infoPanelStudent.textContent = `by ${model.student}`;
  infoPanelDescription.textContent = model.description;
  infoPanelType.textContent = artifactLabels[model.artifact_type] || "✨ Object";

  // Show info panel
  infoPanel.classList.add("show");

  // Visual feedback - highlight selected model
  // Remove highlight from previous
  document.querySelectorAll(".model-selected").forEach((el) => {
    el.classList.remove("model-selected");
  });

  // Add highlight to current
  entity.classList.add("model-selected");

  // Optional: Animate camera to look at model
  focusOnModel(model);
}

// Animate camera to focus on selected model
function focusOnModel(model) {
  const modelIndex = models.indexOf(model);
  if (modelIndex === -1) return;

  const gridX = (modelIndex % GRID_COLS) * GRID_SPACING - ((GRID_COLS - 1) * GRID_SPACING) / 2;
  const gridZ = Math.floor(modelIndex / GRID_COLS) * GRID_SPACING;

  // Calculate camera position to look at model
  const cameraEntity = document.querySelector("a-camera");
  const currentPos = cameraEntity.getAttribute("position");

  // Smooth camera movement (optional - can be expanded with more animation)
  const targetX = gridX;
  const targetY = 1.6;
  const targetZ = gridZ + 3;

  // For now, just a simple position update
  // Full smooth animation would require more complex tweening
  cameraEntity.setAttribute("position", `${targetX} ${targetY} ${targetZ}`);
}

// VR mode toggle
vrToggleBtn.addEventListener("click", () => {
  const vrButton = document.querySelector(".a-enter-vr-button");
  if (vrButton) {
    vrButton.click();
  }
});

// Close info panel when clicking background
document.addEventListener("click", (e) => {
  if (
    e.target === document.body ||
    (e.target.tagName === "A-SCENE" && !e.target.closest(".model-wrapper"))
  ) {
    infoPanel.classList.remove("show");
    currentSelectedModel = null;
  }
});

// Handle model loading errors
scene.addEventListener("model-loaded", (e) => {
  console.log("Model loaded:", e.detail);
});

scene.addEventListener("model-error", (e) => {
  console.error("Model error:", e.detail);
});

// Graceful fallback for GLTF loading
const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function (name, value) {
  if (name === "src" && this.tagName === "A-GLTF-MODEL") {
    // Add fallback handling for model loading
    this.addEventListener("model-error", () => {
      console.warn("Failed to load model:", value);
      // Could add a placeholder mesh here
    });
  }
  return originalSetAttribute.call(this, name, value);
};

// Initialize on scene loaded
scene.addEventListener("loaded", () => {
  console.log("A-Frame scene loaded");
  loadModels();
});

// Also try loading models immediately in case scene is already loaded
if (scene.hasLoaded) {
  loadModels();
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    infoPanel.classList.remove("show");
  }
  if (e.key === "r" || e.key === "R") {
    // Reset camera to home position
    const cameraEntity = document.querySelector("a-camera");
    cameraEntity.setAttribute("position", "0 1.6 5");
  }
});

// Mobile orientation support
window.addEventListener("orientationchange", () => {
  // Refresh models on orientation change
  if (models.length > 0) {
    renderModels();
  }
});

console.log("Museum Viewer initialized");
