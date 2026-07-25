const MODELS_DATA_URL = "/data/museum-models.json";
const GRID_COLS = 3;
const GRID_SPACING = 5.4;
const ROW_SPACING = 5.8;
const TARGET_HEIGHT = 1.8;
const PEDESTAL_HEIGHT = 0.5;
const PEDESTAL_RADIUS = 0.82;
const LABEL_HEIGHT_OFFSET = 0.55;
const DESCRIPTION_PREVIEW_LIMIT = 180;
const SESSION_CACHE_KEY = "vr-museum-model-cache-v1";
const PRELOAD_AHEAD = 3;

const artifactLabels = {
  artifact: "🏺 Artifact",
  landmark: "🏛️ Landmark",
  animal: "🦖 Animal",
  other: "✨ Other",
};

const state = {
  models: [],
  filteredModels: [],
  activeFilter: "all",
  search: "",
  sort: "title-asc",
  selectedId: null,
  loadedIds: new Set(),
  failedIds: new Set(),
  descriptionExpanded: false,
  loadedCache: loadSessionCache(),
};

const scene = document.querySelector("a-scene");
const modelContainer = document.getElementById("model-container");
const loadingIndicator = document.getElementById("loading");
const emptyMuseum = document.getElementById("empty-museum");
const bannerText = document.getElementById("museum-banner-text");
const vrToggleBtn = document.getElementById("vr-toggle");
const searchInput = document.getElementById("museum-search");
const sortSelect = document.getElementById("museum-sort");
const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
const cardList = document.getElementById("museum-card-list");
const emptyList = document.getElementById("museum-empty-list");
const countEl = document.getElementById("museum-count");
const activeFilterEl = document.getElementById("museum-active-filter");
const rig = document.getElementById("rig");

const infoPanelTitle = document.getElementById("model-title");
const infoPanelStudent = document.getElementById("model-student");
const infoPanelDescription = document.getElementById("model-description");
const infoPanelType = document.getElementById("model-type");
const infoPanelDate = document.getElementById("model-date");
const infoSource = document.getElementById("model-source");
const infoLicense = document.getElementById("model-license");
const infoScale = document.getElementById("model-scale");
const infoId = document.getElementById("model-id");
const descriptionToggle = document.getElementById("model-description-toggle");
const sourceLink = document.getElementById("model-source-link");
const fileLink = document.getElementById("model-file-link");

if (!AFRAME.components.billboard) {
  AFRAME.registerComponent("billboard", {
    tick() {
      if (!scene.camera) return;
      this.el.object3D.lookAt(scene.camera.getWorldPosition(new AFRAME.THREE.Vector3()));
    },
  });
}

function loadSessionCache() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveSessionCache() {
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(Array.from(state.loadedIds)));
  } catch {
    // Ignore storage quota or restricted context errors.
  }
}

function setBanner(message) {
  bannerText.textContent = message;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeModel(model, index) {
  const artifactType = artifactLabels[model.artifact_type] ? model.artifact_type : "other";
  const scaleMultiplier = Number.isFinite(Number(model.scaleMultiplier))
    ? Number(model.scaleMultiplier)
    : Number.isFinite(Number(model.scale))
      ? Number(model.scale)
      : 1;
  const normalizedFile = model.file
    ? (String(model.file).startsWith("http") ? String(model.file) : `/${String(model.file).replace(/^\/+/, "")}`)
    : "";

  return {
    ...model,
    id: model.id || `${artifactType}-${Date.now()}-${index}`,
    artifact_type: artifactType,
    student: model.student || "Unknown student",
    title: model.title || "Untitled Model",
    description: model.description || "No description provided yet.",
    date_uploaded: model.date_uploaded || "Unknown date",
    source: model.source || "Student upload",
    license: model.license || "Not specified",
    scaleMultiplier,
    source_url: model.source_url || "",
    file: normalizedFile,
    searchText: [
      model.title,
      model.student,
      model.description,
      model.artifact_type,
      model.source,
      model.license,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

async function loadModels() {
  try {
    const response = await fetch(MODELS_DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models : [];
    state.models = models.map(normalizeModel);
    loadingIndicator.hidden = true;

    if (!state.models.length) {
      emptyMuseum.hidden = false;
      setBanner("The museum is empty. Upload a model to begin.");
      return;
    }

    applyFilters();
    selectModel(state.filteredModels[0]?.id || state.models[0]?.id, { focusCamera: false });
    setBanner(`Loaded ${state.models.length} models across the museum.`);
  } catch (error) {
    console.error("Error loading museum models:", error);
    loadingIndicator.innerHTML = `<div class="museum-empty"><h2>Error loading museum</h2><p>${error.message}</p></div>`;
  }
}

function applyFilters() {
  const query = state.search.trim().toLowerCase();
  const filtered = state.models.filter((model) => {
    const matchesFilter = state.activeFilter === "all" || model.artifact_type === state.activeFilter;
    const matchesSearch = !query || model.searchText.includes(query);
    return matchesFilter && matchesSearch;
  });

  filtered.sort((a, b) => {
    switch (state.sort) {
      case "date-desc":
        return String(b.date_uploaded).localeCompare(String(a.date_uploaded));
      case "student-asc":
        return a.student.localeCompare(b.student);
      case "type-asc":
        return a.artifact_type.localeCompare(b.artifact_type) || a.title.localeCompare(b.title);
      case "title-asc":
      default:
        return a.title.localeCompare(b.title);
    }
  });

  state.filteredModels = filtered;
  renderCards();
  renderScene();

  const label = state.activeFilter === "all"
    ? "All sections"
    : `${artifactLabels[state.activeFilter] || "Section"}s`;
  countEl.textContent = `${filtered.length} model${filtered.length === 1 ? "" : "s"}`;
  activeFilterEl.textContent = label;
  emptyList.hidden = filtered.length !== 0;

  if (state.selectedId && !filtered.some((model) => model.id === state.selectedId)) {
    selectModel(filtered[0]?.id || null, { focusCamera: false });
  }
}

function renderCards() {
  cardList.innerHTML = "";
  state.filteredModels.forEach((model) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `museum-card${state.selectedId === model.id ? " active" : ""}`;
    button.dataset.modelId = model.id;
    button.innerHTML = `
      <div class="museum-card-title-row">
        <h3>${escapeHtml(model.title)}</h3>
        <span class="museum-badge">${artifactLabels[model.artifact_type] || "✨ Other"}</span>
      </div>
      <p class="museum-card-student">${escapeHtml(model.student)}</p>
      <p class="museum-card-description">${escapeHtml(getPreview(model.description, 88))}</p>
      <div class="museum-card-meta-row">
        <span class="museum-card-date">${escapeHtml(model.date_uploaded)}</span>
        <span class="museum-card-date">${escapeHtml(model.license)}</span>
      </div>
    `;
    button.addEventListener("click", () => selectModel(model.id, { focusCamera: true }));
    cardList.appendChild(button);
  });
}

function gridPosition(index) {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  return {
    x: (col - (GRID_COLS - 1) / 2) * GRID_SPACING,
    z: -row * ROW_SPACING,
  };
}

function renderScene() {
  modelContainer.innerHTML = "";

  if (!state.filteredModels.length) {
    setBanner("No models match the current filters.");
    return;
  }

  state.filteredModels.forEach((model, index) => {
    const wrapper = document.createElement("a-entity");
    const position = gridPosition(index);
    wrapper.setAttribute("position", `${position.x} 0 ${position.z}`);
    wrapper.dataset.modelId = model.id;

    const pedestal = document.createElement("a-cylinder");
    pedestal.setAttribute("position", `0 ${PEDESTAL_HEIGHT / 2} 0`);
    pedestal.setAttribute("radius", PEDESTAL_RADIUS);
    pedestal.setAttribute("height", PEDESTAL_HEIGHT);
    pedestal.setAttribute("color", "#34455e");
    pedestal.setAttribute("material", "roughness: 0.48; metalness: 0.16");
    pedestal.setAttribute("shadow", "cast: true; receive: true");
    pedestal.addEventListener("click", (event) => {
      event.stopPropagation();
      selectModel(model.id, { focusCamera: true });
    });
    wrapper.appendChild(pedestal);

    const plaque = document.createElement("a-entity");
    plaque.setAttribute("position", `0 ${PEDESTAL_HEIGHT * 0.52} ${PEDESTAL_RADIUS + 0.012}`);
    plaque.setAttribute("geometry", "primitive: plane; width: 1.18; height: 0.28");
    plaque.setAttribute("material", "color: #0f172a; opacity: 0.92");
    const plaqueText = document.createElement("a-entity");
    plaqueText.setAttribute("position", "0 0 0.01");
    plaqueText.setAttribute(
      "text",
      `value: ${model.title}\\n${model.student}; align: center; width: 1.45; color: #f8fafc; baseline: center; anchor: center; wrapCount: 20`
    );
    plaque.appendChild(plaqueText);
    wrapper.appendChild(plaque);

    const modelEntity = document.createElement("a-gltf-model");
    modelEntity.setAttribute("id", `model-${slugify(model.id)}`);
    modelEntity.dataset.modelId = model.id;
    modelEntity.setAttribute("position", `0 ${PEDESTAL_HEIGHT} 0`);
    modelEntity.setAttribute("rotation", "0 18 0");
    modelEntity.setAttribute("scale", "0.01 0.01 0.01");
    modelEntity.setAttribute("shadow", "cast: true; receive: false");
    modelEntity.setAttribute("class", "museum-model");
    modelEntity.setAttribute("visible", state.loadedIds.has(model.id) || state.loadedCache.has(model.id) ? "true" : "false");
    modelEntity.addEventListener("model-loaded", () => fitModelToPedestal(modelEntity, model, wrapper));
    modelEntity.addEventListener("model-error", () => handleModelError(model, modelEntity));
    modelEntity.addEventListener("click", (event) => {
      event.stopPropagation();
      selectModel(model.id, { focusCamera: true });
    });
    wrapper.appendChild(modelEntity);

    const label = document.createElement("a-entity");
    label.setAttribute("position", `0 ${PEDESTAL_HEIGHT + TARGET_HEIGHT + LABEL_HEIGHT_OFFSET} 0`);
    label.setAttribute("billboard", "");
    const labelBg = document.createElement("a-entity");
    labelBg.setAttribute("geometry", "primitive: plane; width: 1.2; height: 0.24");
    labelBg.setAttribute("material", "color: #08101d; opacity: 0.88");
    const labelText = document.createElement("a-entity");
    labelText.setAttribute("position", "0 0 0.01");
    labelText.setAttribute(
      "text",
      `value: ${artifactLabels[model.artifact_type] || "✨ Other"}; align: center; width: 1.6; color: #cfe7ff; baseline: center; anchor: center`
    );
    labelBg.appendChild(labelText);
    label.appendChild(labelBg);
    wrapper.appendChild(label);

    modelContainer.appendChild(wrapper);
  });

  lazyLoadVisibleModels();
}

function lazyLoadVisibleModels() {
  state.filteredModels.forEach((model, index) => {
    const shouldLoad = index < PRELOAD_AHEAD || model.id === state.selectedId || state.loadedCache.has(model.id);
    if (shouldLoad) ensureModelLoaded(model.id);
  });
}

function ensureModelLoaded(modelId) {
  if (state.failedIds.has(modelId) || state.loadedIds.has(modelId)) return;
  const model = state.filteredModels.find((entry) => entry.id === modelId) || state.models.find((entry) => entry.id === modelId);
  if (!model || !model.file) return;
  const entity = document.querySelector(`[data-model-id="${CSS.escape(modelId)}"].museum-model`);
  if (!entity) return;
  entity.setAttribute("src", model.file);
  entity.setAttribute("visible", "true");
  state.loadedIds.add(modelId);
  saveSessionCache();
}

function preloadAdjacentModels(selectedIndex) {
  for (let step = 1; step <= PRELOAD_AHEAD; step += 1) {
    const nextModel = state.filteredModels[selectedIndex + step];
    if (nextModel) ensureModelLoaded(nextModel.id);
  }
}

function fitModelToPedestal(modelEntity, model, wrapper) {
  const mesh = modelEntity.getObject3D("mesh");
  if (!mesh) return;

  mesh.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = false;
      if (node.material && "envMapIntensity" in node.material) {
        node.material.envMapIntensity = 1.1;
      }
    }
  });

  const THREE = AFRAME.THREE;
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const currentHeight = size.y || 1;
  const finalScale = (TARGET_HEIGHT / currentHeight) * (model.scaleMultiplier || 1);
  modelEntity.setAttribute("scale", `${finalScale} ${finalScale} ${finalScale}`);

  const scaledBox = new THREE.Box3().setFromObject(mesh);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);
  const wrapperPosition = new THREE.Vector3();
  wrapper.object3D.getWorldPosition(wrapperPosition);

  const offsetX = -(scaledCenter.x - wrapperPosition.x);
  const offsetZ = -(scaledCenter.z - wrapperPosition.z);
  const offsetY = PEDESTAL_HEIGHT - scaledBox.min.y + 0.02;
  modelEntity.setAttribute("position", `${offsetX} ${offsetY} ${offsetZ}`);
}

// IDEA: handleModelError only swaps in a red fallback box - a student could
// add a "retry" click handler on the fallback that re-sets modelEntity's
// src and clears it from state.failedIds.
function handleModelError(model, modelEntity) {
  state.failedIds.add(model.id);
  state.loadedIds.delete(model.id);
  modelEntity.setAttribute("visible", "false");

  const fallback = document.createElement("a-box");
  fallback.setAttribute("position", `0 ${PEDESTAL_HEIGHT + 0.55} 0`);
  fallback.setAttribute("width", "0.9");
  fallback.setAttribute("height", "0.9");
  fallback.setAttribute("depth", "0.9");
  fallback.setAttribute("color", "#ef4444");
  fallback.setAttribute("material", "opacity: 0.86");
  modelEntity.parentElement.appendChild(fallback);

  setBanner(`A model failed to load: ${model.title}`);
}

function selectModel(modelId, options = {}) {
  const model = state.filteredModels.find((entry) => entry.id === modelId) || state.models.find((entry) => entry.id === modelId);
  if (!model) {
    clearSelection();
    return;
  }

  state.selectedId = model.id;
  state.descriptionExpanded = false;
  renderCards();
  ensureModelLoaded(model.id);
  updateInfoPanel(model);
  highlightSelectedModel(model.id);

  const selectedIndex = state.filteredModels.findIndex((entry) => entry.id === model.id);
  if (selectedIndex >= 0) preloadAdjacentModels(selectedIndex);

  if (options.focusCamera) focusCameraOnModel(model.id);
  setBanner(`Selected ${model.title} by ${model.student}`);
}

function clearSelection() {
  state.selectedId = null;
  highlightSelectedModel(null);
}

function updateInfoPanel(model) {
  infoPanelType.textContent = artifactLabels[model.artifact_type] || "✨ Other";
  infoPanelTitle.textContent = model.title;
  infoPanelStudent.textContent = `Created by ${model.student}`;
  infoPanelDate.textContent = `Uploaded ${model.date_uploaded}`;
  infoSource.textContent = model.source || "Unknown";
  infoLicense.textContent = model.license || "Unknown";
  infoScale.textContent = String(model.scaleMultiplier ?? 1);
  infoId.textContent = model.id;
  renderDescription(model);

  if (model.source_url) {
    sourceLink.hidden = false;
    sourceLink.href = model.source_url;
  } else {
    sourceLink.hidden = true;
    sourceLink.removeAttribute("href");
  }

  if (model.file) {
    fileLink.hidden = false;
    fileLink.href = model.file;
  } else {
    fileLink.hidden = true;
    fileLink.removeAttribute("href");
  }
}

function renderDescription(model) {
  const fullText = model.description || "No description provided.";
  const shouldTruncate = fullText.length > DESCRIPTION_PREVIEW_LIMIT;
  const nextText = state.descriptionExpanded || !shouldTruncate
    ? fullText
    : `${fullText.slice(0, DESCRIPTION_PREVIEW_LIMIT).trim()}...`;

  infoPanelDescription.textContent = nextText;
  descriptionToggle.hidden = !shouldTruncate;
  if (!shouldTruncate) return;
  descriptionToggle.textContent = state.descriptionExpanded ? "Show less" : "Show full description";
  descriptionToggle.onclick = () => {
    state.descriptionExpanded = !state.descriptionExpanded;
    renderDescription(model);
  };
}

function highlightSelectedModel(modelId) {
  document.querySelectorAll(".museum-model").forEach((entity) => {
    entity.setAttribute("animation__highlight", modelId && entity.dataset.modelId === modelId
      ? "property: rotation; to: 0 378 0; loop: true; dur: 9000; easing: linear"
      : "property: rotation; to: 0 18 0; dur: 500; easing: easeOutQuad");
  });
}

function focusCameraOnModel(modelId) {
  const wrapper = Array.from(modelContainer.children).find((node) => node.dataset.modelId === modelId);
  if (!wrapper || !rig) return;
  const position = wrapper.getAttribute("position");
  rig.setAttribute("position", `${position.x} 1.6 ${position.z + 4.2}`);
}

function getPreview(text, maxLength) {
  const value = String(text || "");
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((entry) => entry.classList.toggle("active", entry === button));
    state.activeFilter = button.dataset.filter || "all";
    applyFilters();
  });
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value || "";
  applyFilters();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value || "title-asc";
  applyFilters();
});

vrToggleBtn.addEventListener("click", async () => {
  if (scene.is("vr-mode")) {
    scene.exitVR();
    return;
  }
  try {
    await scene.enterVR();
  } catch {
    setBanner("VR is unavailable on this device or browser.");
  }
});

scene.addEventListener("enter-vr", () => {
  vrToggleBtn.textContent = "Exit VR";
  setBanner("VR mode active.");
});

scene.addEventListener("exit-vr", () => {
  vrToggleBtn.textContent = "Enter VR";
  setBanner("Returned to desktop mode.");
});

document.addEventListener("keydown", (event) => {
  const tag = event.target.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (event.key === "r" || event.key === "R") {
    rig.setAttribute("position", "0 1.6 7");
    setBanner("Camera reset.");
  }
  if (event.key === "Escape") {
    clearSelection();
    setBanner("Selection cleared.");
  }
  if (event.key === "n" || event.key === "p") {
    const list = state.filteredModels;
    if (!list.length) return;
    const currentIndex = list.findIndex((entry) => entry.id === state.selectedId);
    const delta = event.key === "n" ? 1 : -1;
    const nextIndex = (currentIndex + delta + list.length) % list.length;
    selectModel(list[nextIndex].id, { focusCamera: true });
  }
});

if (scene.hasLoaded) {
  loadModels();
} else {
  scene.addEventListener("loaded", loadModels, { once: true });
}
