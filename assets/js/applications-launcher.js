import { categoryMeta, steamGalaxyNodes } from "./app-registry.js";

const FOLDER_ORDER = ["coding", "games", "robotics", "design3d", "art", "music", "science", "research", "immersive", "ai"];

const FOLDER_DETAILS = {
  coding: { label: "Coding", symbol: "⌨️", color: "#5b87f7" },
  games: { label: "Game Design", symbol: "🎮", color: "#f06479" },
  robotics: { label: "Robotics", symbol: "🤖", color: "#48bd7a" },
  design3d: { label: "3D Design", symbol: "🧊", color: "#f39a4d" },
  art: { label: "Art & Media", symbol: "🎨", color: "#e668a8" },
  music: { label: "Music", symbol: "🎵", color: "#9670df" },
  science: { label: "Science", symbol: "🔬", color: "#e2b63b" },
  research: { label: "Research", symbol: "🔎", color: "#33afa8" },
  immersive: { label: "VR & Creative Tech", symbol: "🥽", color: "#7557c7" },
  ai: { label: "AI Tools", symbol: "✨", color: "#e38d32" }
};

const QUICK_START_IDS = ["scratch", "codeorg", "tinkercad", "chrome-music-lab", "phet", "googledocs"];
const ICON_COLORS = ["#3f68dc", "#d84e67", "#2d9c72", "#7c59c7", "#d87932", "#168d9c", "#52617c", "#b64993"];

const tools = steamGalaxyNodes.filter((node) => node.type === "tool" && node.link);
const toolById = new Map(tools.map((tool) => [tool.id, tool]));

const elements = {
  title: document.getElementById("applications-title"),
  instruction: document.getElementById("launchpad-instruction"),
  location: document.getElementById("launchpad-location"),
  folderView: document.getElementById("folder-view"),
  folderGrid: document.getElementById("folder-grid"),
  appsView: document.getElementById("apps-view"),
  appGrid: document.getElementById("app-grid"),
  folderTitle: document.getElementById("folder-title"),
  folderDescription: document.getElementById("folder-description"),
  folderSymbol: document.getElementById("folder-symbol"),
  back: document.getElementById("folder-back"),
  searchToggle: document.getElementById("search-toggle"),
  searchPanel: document.getElementById("app-search-panel"),
  search: document.getElementById("app-search"),
  clearSearch: document.getElementById("clear-app-search"),
  grade: document.getElementById("grade-filter"),
  empty: document.getElementById("apps-empty"),
  resetFilters: document.getElementById("reset-app-filters"),
  dock: document.getElementById("favorites-dock"),
  dockApps: document.getElementById("dock-apps"),
  aiDialog: document.getElementById("ai-awareness-modal"),
  aiPledge: document.getElementById("ai-pledge"),
  aiConfirm: document.getElementById("ai-confirm"),
  tinkercadDialog: document.getElementById("tinkercad-picker")
};

const state = {
  folder: null,
  query: "",
  grade: "all",
  pendingTool: null,
  lastFocused: null
};

function stableHash(value) {
  let hash = 0;
  for (const character of String(value)) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function iconText(tool) {
  const compact = tool.shortLabel || tool.label;
  const words = compact.replace(/[^a-zA-Z0-9+.# ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "APP";
  if (words.length === 1) return words[0].slice(0, words[0].length <= 4 ? 3 : 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function iconColor(tool) {
  const category = FOLDER_DETAILS[tool.category];
  if (category) {
    const offset = (stableHash(tool.id) % 18) - 9;
    return `color-mix(in srgb, ${category.color} ${82 + offset}%, #26324d)`;
  }
  return ICON_COLORS[stableHash(tool.id) % ICON_COLORS.length];
}

function toolsInFolder(folderId) {
  return tools.filter((tool) => tool.category === folderId || (tool.categories || []).includes(folderId));
}

function categoryMatches(tool, folderId) {
  if (!folderId || folderId === "search") return true;
  return tool.category === folderId || (tool.categories || []).includes(folderId);
}

function toolMatches(tool) {
  if (!categoryMatches(tool, state.folder)) return false;
  if (state.grade !== "all" && !(tool.grades || []).includes(state.grade)) return false;
  if (!state.query) return true;
  const searchable = [tool.label, tool.shortLabel, tool.description, tool.teaches, ...(tool.tags || [])].join(" ").toLowerCase();
  return searchable.includes(state.query);
}

function faviconUrl(tool, size = 128) {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(tool.link)}&sz=${size}`;
}

function makeIconArtwork(tool, className) {
  const icon = document.createElement("span");
  icon.className = className;
  icon.style.setProperty("--icon-color", iconColor(tool));
  icon.setAttribute("aria-hidden", "true");

  const fallback = document.createElement("span");
  fallback.className = "app-icon-fallback";
  fallback.textContent = iconText(tool);

  const image = document.createElement("img");
  image.className = "app-favicon";
  image.src = faviconUrl(tool, className === "mini-app-icon" ? 64 : 128);
  image.alt = "";
  image.loading = className === "mini-app-icon" ? "lazy" : "eager";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("load", () => icon.classList.add("has-favicon"), { once: true });
  image.addEventListener("error", () => image.remove(), { once: true });

  icon.append(fallback, image);
  return icon;
}

function makeMiniIcon(tool) {
  return makeIconArtwork(tool, "mini-app-icon");
}

function renderFolders() {
  elements.folderGrid.replaceChildren();
  FOLDER_ORDER.forEach((folderId) => {
    const details = FOLDER_DETAILS[folderId];
    const folderTools = toolsInFolder(folderId);
    const button = document.createElement("button");
    button.className = "folder-button";
    button.type = "button";
    button.dataset.folder = folderId;
    button.setAttribute("aria-label", `${details.label} folder, ${folderTools.length} apps`);

    const shape = document.createElement("span");
    shape.className = "folder-shape";
    shape.style.setProperty("--folder-color", details.color);
    const preview = document.createElement("span");
    preview.className = "folder-preview";
    folderTools.slice(0, 4).forEach((tool) => preview.append(makeMiniIcon(tool)));
    shape.append(preview);

    const label = document.createElement("span");
    label.className = "folder-label";
    label.textContent = details.label;
    const count = document.createElement("span");
    count.className = "folder-count";
    count.textContent = `${folderTools.length} apps`;
    button.append(shape, label, count);
    elements.folderGrid.append(button);
  });
}

function makeAppButton(tool, compact = false) {
  const button = document.createElement("button");
  button.className = compact ? "dock-button" : "app-button";
  button.type = "button";
  button.dataset.toolId = tool.id;
  button.setAttribute("aria-label", `Open ${tool.label}${tool.login ? `. ${tool.login}` : ""}`);

  const icon = makeIconArtwork(tool, compact ? "dock-icon" : "app-icon");

  const label = document.createElement("span");
  label.className = "app-label";
  label.textContent = tool.shortLabel || tool.label;
  button.append(icon, label);

  if (!compact) {
    const note = document.createElement("span");
    note.className = "app-note";
    note.textContent = tool.free ? (tool.login?.toLowerCase().includes("no login") ? "Free · no login" : "Free") : "Account or plan may be needed";
    button.append(note);
  }
  return button;
}

function renderDock() {
  elements.dockApps.replaceChildren();
  QUICK_START_IDS.map((id) => toolById.get(id)).filter(Boolean).forEach((tool) => elements.dockApps.append(makeAppButton(tool, true)));
}

function renderApps() {
  const matches = tools.filter(toolMatches).sort((a, b) => a.label.localeCompare(b.label));
  elements.appGrid.replaceChildren();
  matches.forEach((tool) => elements.appGrid.append(makeAppButton(tool)));
  elements.empty.hidden = matches.length > 0;
  elements.location.textContent = `${matches.length} ${matches.length === 1 ? "app" : "apps"}${state.grade === "all" ? "" : ` for ${elements.grade.selectedOptions[0].textContent}`}`;
}

function updateHash() {
  const params = new URLSearchParams();
  if (state.folder) params.set("folder", state.folder);
  if (state.grade !== "all") params.set("grade", state.grade);
  const hash = params.toString();
  history.replaceState(null, "", `${location.pathname}${location.search}${hash ? `#${hash}` : ""}`);
}

function openFolder(folderId, options = {}) {
  if (!FOLDER_DETAILS[folderId]) return;
  state.folder = folderId;
  const details = FOLDER_DETAILS[folderId];
  const meta = categoryMeta[folderId];
  elements.folderView.hidden = true;
  elements.appsView.hidden = false;
  elements.back.hidden = false;
  elements.title.textContent = details.label;
  elements.instruction.textContent = "Tap an app to open it.";
  elements.folderTitle.textContent = details.label;
  elements.folderDescription.textContent = meta?.description || "Choose an app to begin.";
  elements.folderSymbol.textContent = details.symbol;
  elements.folderSymbol.style.setProperty("--folder-color", details.color);
  elements.dock.hidden = true;
  renderApps();
  updateHash();
  if (options.focus !== false) elements.back.focus();
  if (options.scroll) elements.appsView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showFolders(options = {}) {
  state.folder = null;
  state.query = "";
  elements.search.value = "";
  elements.clearSearch.hidden = true;
  elements.folderView.hidden = false;
  elements.appsView.hidden = true;
  elements.back.hidden = true;
  elements.title.textContent = "Choose a folder.";
  elements.instruction.textContent = "Then tap an app to open it.";
  elements.location.textContent = "All folders";
  elements.dock.hidden = false;
  updateHash();
  if (options.focus !== false) document.querySelector(".folder-button")?.focus();
}

function openSearch() {
  elements.searchPanel.hidden = false;
  elements.searchToggle.setAttribute("aria-expanded", "true");
  elements.search.focus();
}

function closeSearch() {
  elements.searchPanel.hidden = true;
  elements.searchToggle.setAttribute("aria-expanded", "false");
}

function searchAllApps() {
  if (!state.folder) {
    state.folder = "search";
    elements.folderView.hidden = true;
    elements.appsView.hidden = false;
    elements.back.hidden = false;
    elements.title.textContent = "Search results";
    elements.instruction.textContent = "Tap an app to open it.";
    elements.folderTitle.textContent = "Search results";
    elements.folderDescription.textContent = "Results from every classroom folder.";
    elements.folderSymbol.textContent = "⌕";
    elements.folderSymbol.style.setProperty("--folder-color", "#64748b");
    elements.dock.hidden = true;
  }
  const query = elements.search.value.trim().toLowerCase();
  state.query = query;
  elements.clearSearch.hidden = !query;
  if (state.folder === "search") state.folder = null;
  renderApps();
  if (!state.folder) state.folder = "search";
}

function focusableIn(dialog) {
  return Array.from(dialog.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])"));
}

function openDialog(dialog) {
  state.lastFocused = document.activeElement;
  dialog.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => focusableIn(dialog)[0]?.focus());
}

function closeDialog(dialog) {
  dialog.hidden = true;
  document.body.style.overflow = "";
  state.pendingTool = null;
  if (state.lastFocused instanceof HTMLElement) state.lastFocused.focus();
}

function launchTool(tool) {
  if (!tool) return;
  state.pendingTool = tool;
  if (tool.id === "tinkercad") {
    openDialog(elements.tinkercadDialog);
    return;
  }
  if (tool.category === "ai" || (tool.categories || []).includes("ai")) {
    elements.aiPledge.checked = false;
    elements.aiConfirm.disabled = true;
    openDialog(elements.aiDialog);
    return;
  }
  window.open(tool.link, "_blank", "noopener,noreferrer");
  state.pendingTool = null;
}

function restoreFromHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const grade = params.get("grade");
  if (["K-2", "3-5", "6-8", "9-12"].includes(grade)) {
    state.grade = grade;
    elements.grade.value = grade;
  }
  const folder = params.get("folder");
  if (folder && FOLDER_DETAILS[folder]) openFolder(folder, { focus: false });
  else showFolders({ focus: false });
}

elements.folderGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-folder]");
  if (button) openFolder(button.dataset.folder, { scroll: true });
});

[elements.appGrid, elements.dockApps].forEach((container) => container.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tool-id]");
  if (button) launchTool(toolById.get(button.dataset.toolId));
}));

elements.back.addEventListener("click", () => showFolders());
elements.searchToggle.addEventListener("click", () => elements.searchPanel.hidden ? openSearch() : closeSearch());
elements.search.addEventListener("input", searchAllApps);
elements.clearSearch.addEventListener("click", () => {
  elements.search.value = "";
  state.query = "";
  elements.clearSearch.hidden = true;
  renderApps();
  elements.search.focus();
});

elements.grade.addEventListener("change", () => {
  state.grade = elements.grade.value;
  if (elements.appsView.hidden) elements.location.textContent = state.grade === "all" ? "All folders" : `Folders · ${elements.grade.selectedOptions[0].textContent}`;
  else renderApps();
  updateHash();
});

elements.resetFilters.addEventListener("click", () => {
  state.grade = "all";
  state.query = "";
  elements.grade.value = "all";
  elements.search.value = "";
  elements.clearSearch.hidden = true;
  renderApps();
});

elements.aiPledge.addEventListener("change", () => { elements.aiConfirm.disabled = !elements.aiPledge.checked; });
elements.aiConfirm.addEventListener("click", () => {
  const tool = state.pendingTool;
  closeDialog(elements.aiDialog);
  if (tool) window.open(tool.link, "_blank", "noopener,noreferrer");
});

document.addEventListener("click", (event) => {
  const close = event.target.closest("[data-close-dialog]");
  if (close) {
    const dialog = close.dataset.closeDialog === "ai" ? elements.aiDialog : elements.tinkercadDialog;
    closeDialog(dialog);
    return;
  }
  const classButton = event.target.closest("[data-join-url]");
  if (classButton) {
    window.open(classButton.dataset.joinUrl, "_blank", "noopener,noreferrer");
    closeDialog(elements.tinkercadDialog);
  }
});

document.addEventListener("keydown", (event) => {
  const dialog = [elements.aiDialog, elements.tinkercadDialog].find((candidate) => !candidate.hidden);
  if (!dialog) {
    if (event.key === "Escape" && !elements.searchPanel.hidden) closeSearch();
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog(dialog);
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = focusableIn(dialog);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

renderFolders();
renderDock();
restoreFromHash();
