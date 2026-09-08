import { categoryMeta, steamGalaxyNodes } from "./app-registry.js";

import { projectPaths } from "./app-learning-resources.js";

const ACCESS_LABELS = {"no-account":"No account", classroom:"Join your class", installed:"Installed / lab", account:"Account needed", check:"Access to check"};
const ACCESS_HELP = {"no-account":"Use these free activities without signing in. Open “Save & return” to learn how to keep your work.", classroom:"Your teacher sets up access. You do not need a personal email address.", installed:"Ask your teacher which tools are ready on your classroom computer. Links may open download or store pages.", account:"Use these only with an account your teacher has approved. Free tiers may have limits.", all:"The full collection. “Access to check” means we have not yet confirmed whether you can use the tool without signing in."};

const FOLDER_ORDER = ["coding", "games", "robotics", "design3d", "art", "music", "storytelling", "math", "science", "research", "immersive", "ai", "cybersecurity", "steam"];

// "steam" is a folder of folders: opening it shows these four genre folders instead of apps.
const FOLDER_GROUPS = {
  steam: ["steam-software", "steam-sims", "steam-arcade", "steam-vr"]
};

const FOLDER_DETAILS = {
  storytelling: { label: "Stories & Animation", symbol: "📖", color: "#b76b94" },
  math: { label: "Math & Patterns", symbol: "📐", color: "#36a69c" },
  coding: { label: "Coding", symbol: "⌨️", color: "#5b87f7" },
  games: { label: "Game Design", symbol: "🎮", color: "#f06479" },
  robotics: { label: "Robotics", symbol: "🤖", color: "#48bd7a" },
  design3d: { label: "3D Design", symbol: "🧊", color: "#f39a4d" },
  art: { label: "Art & Media", symbol: "🎨", color: "#e668a8" },
  music: { label: "Music", symbol: "🎵", color: "#9670df" },
  science: { label: "Science", symbol: "🔬", color: "#e2b63b" },
  research: { label: "Research", symbol: "🔎", color: "#33afa8" },
  immersive: { label: "VR & Creative Tech", symbol: "🥽", color: "#7557c7" },
  ai: { label: "AI Tools", symbol: "✨", color: "#e38d32" },
  cybersecurity: { label: "Cybersecurity", symbol: "🛡️", color: "#ff4d5e" },
  steam: { label: "Steam Apps", symbol: "🖥️", color: "#66c0f4" },
  "steam-software": { label: "Steam: Creative Software", symbol: "🛠️", color: "#66c0f4" },
  "steam-sims": { label: "Steam: Simulations", symbol: "🧪", color: "#4fae7a" },
  "steam-arcade": { label: "Steam: Arcade & Story Games", symbol: "🕹️", color: "#ff7a59" },
  "steam-vr": { label: "Steam: VR Experiences", symbol: "🕶️", color: "#8a63d2" }
};

function parentGroupOf(folderId) {
  return Object.keys(FOLDER_GROUPS).find((groupId) => FOLDER_GROUPS[groupId].includes(folderId)) || null;
}

const QUICK_START_IDS = ["scratch", "beepbox", "twine", "piskel", "mlc-geoboard", "phet", "tinkercad", "codeorg"];
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
  access: document.getElementById("access-filter"),
  accessExplanation: document.getElementById("access-explanation"),
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
  group: null,
  query: "",
  grade: "all",
  access: "no-account",
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
  const childIds = FOLDER_GROUPS[folderId];
  if (childIds) {
    const seen = new Set();
    return childIds.flatMap((childId) => toolsInFolder(childId)).filter((tool) => (seen.has(tool.id) ? false : seen.add(tool.id)));
  }
  return tools.filter((tool) => tool.category === folderId || (tool.categories || []).includes(folderId));
}

function categoryMatches(tool, folderId) {
  if (!folderId || folderId === "search") return true;
  return tool.category === folderId || (tool.categories || []).includes(folderId);
}

function matchesFilters(tool) {
  return (state.access === "all" || tool.access === state.access) &&
    (state.grade === "all" || (tool.grades || []).includes(state.grade));
}

function toolMatches(tool) {
  if (!matchesFilters(tool)) return false;
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

function renderFolders(folderIds) {
  elements.folderGrid.replaceChildren();
  folderIds.forEach((folderId) => {
    const details = FOLDER_DETAILS[folderId];
    const folderTools = toolsInFolder(folderId).filter(matchesFilters);
    if (!folderTools.length) return;
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
  document.getElementById("folders-empty").hidden = elements.folderGrid.childElementCount > 0;
}

function makeAppButton(tool, compact = false) {
  const button = document.createElement("button");
  button.className = compact ? "dock-button" : "app-button";
  button.type = "button";
  button.dataset.toolId = tool.id;
  button.setAttribute("aria-label", `Open ${tool.label}. ${ACCESS_LABELS[tool.access]}. Opens a new tab.`);

  const icon = makeIconArtwork(tool, compact ? "dock-icon" : "app-icon");

  const label = document.createElement("span");
  label.className = "app-label";
  label.textContent = tool.shortLabel || tool.label;
  button.append(icon, label);

  if (!compact) {
    const note = document.createElement("span");
    note.className = "app-note";
    note.textContent = `${ACCESS_LABELS[tool.access]} · ${tool.cost}`;
    button.append(note);
  }
  if (compact) return button;
  const card = document.createElement("article");
  card.className = "app-card";
  card.dataset.access = tool.access;
  const purpose = document.createElement("p");
  purpose.className = "app-purpose";
  purpose.textContent = tool.description;
  const details = document.createElement("details");
  details.className = "app-save";
  const summary = document.createElement("summary");
  summary.textContent = "Save & return";
  const instructions = document.createElement("p");
  instructions.textContent = tool.save;
  details.append(summary, instructions);
  if (tool.source) {
    const source = document.createElement("a");
    source.href = tool.source;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = `Tool guide · reviewed ${tool.reviewedOn}`;
    details.append(source);
  }
  card.append(button, purpose, details);
  return card;
}

function renderDock() {
  elements.dockApps.replaceChildren();
  const favorites = QUICK_START_IDS.map(id => toolById.get(id)).filter(tool => tool && matchesFilters(tool));
  const picks = favorites.length ? favorites : tools.filter(matchesFilters).slice(0, 6);
  picks.slice(0, 6).forEach(tool => elements.dockApps.append(makeAppButton(tool, true)));
  elements.dock.hidden = !!state.folder || !!state.group || !picks.length;
}

function renderApps() {
  const matches = tools.filter(toolMatches).sort((a, b) => a.label.localeCompare(b.label));
  elements.appGrid.replaceChildren();
  matches.forEach((tool) => elements.appGrid.append(makeAppButton(tool)));
  elements.empty.hidden = matches.length > 0;
  elements.location.textContent = `${matches.length} ${matches.length === 1 ? "app" : "apps"}${state.grade === "all" ? "" : ` for ${elements.grade.selectedOptions[0].textContent}`}`;
}

function folderLocationText() {
  const count = tools.filter(matchesFilters).length;
  const base = `${state.group ? FOLDER_DETAILS[state.group].label : "All folders"} · ${count} resources`;
  return state.grade === "all" ? base : `${base} · ${elements.grade.selectedOptions[0].textContent}`;
}

function updateHash() {
  const params = new URLSearchParams();
  if (state.folder) params.set("folder", state.folder);
  else if (state.group) params.set("group", state.group);
  if (state.grade !== "all") params.set("grade", state.grade);
  params.set("access", state.access);
  if (state.query) params.set("q", state.query);
  const hash = params.toString();
  history.replaceState(null, "", `${location.pathname}${location.search}${hash ? `#${hash}` : ""}`);
}

function openFolder(folderId, options = {}) {
  if (!FOLDER_DETAILS[folderId] || FOLDER_GROUPS[folderId]) return;
  state.folder = folderId;
  state.group = parentGroupOf(folderId);
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

function openGroup(groupId, options = {}) {
  const childIds = FOLDER_GROUPS[groupId];
  if (!childIds) return;
  state.group = groupId;
  state.folder = null;
  const details = FOLDER_DETAILS[groupId];
  elements.folderView.hidden = false;
  elements.appsView.hidden = true;
  elements.back.hidden = false;
  elements.title.textContent = details.label;
  elements.instruction.textContent = "Choose a folder, then tap an app to open it.";
  elements.location.textContent = folderLocationText();
  elements.dock.hidden = true;
  renderFolders(childIds);
  updateHash();
  if (options.focus !== false) document.querySelector(".folder-button")?.focus();
  if (options.scroll) elements.folderView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showFolders(options = {}) {
  state.folder = null;
  state.group = null;
  state.query = "";
  elements.search.value = "";
  elements.clearSearch.hidden = true;
  elements.folderView.hidden = false;
  elements.appsView.hidden = true;
  elements.back.hidden = true;
  elements.title.textContent = "Choose a folder.";
  elements.instruction.textContent = "Choose an activity. Read how to save it.";
  elements.location.textContent = folderLocationText();
  renderDock();
  renderFolders(FOLDER_ORDER);
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
  state.folder = "search";
  state.group = null;
  elements.folderView.hidden = true;
  elements.appsView.hidden = false;
  elements.back.hidden = false;
  elements.title.textContent = "Search results";
  elements.instruction.textContent = "Search every folder within your access and grade choices.";
  elements.folderTitle.textContent = "Search results";
  elements.folderDescription.textContent = "Try an app name or something you want to make.";
  elements.folderSymbol.textContent = "⌕";
  state.query = elements.search.value.trim().toLowerCase();
  elements.clearSearch.hidden = !state.query;
  elements.dock.hidden = true;
  renderApps();
  updateHash();
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
  const access = params.get("access");
  state.access = Object.hasOwn(ACCESS_HELP, access) ? access : "no-account";
  elements.access.value = state.access;
  elements.accessExplanation.textContent = ACCESS_HELP[state.access];
  state.grade = "all";
  elements.grade.value = "all";
  const grade = params.get("grade");
  if (["K-2", "3-5", "6-8", "9-12"].includes(grade)) {
    state.grade = grade;
    elements.grade.value = grade;
  }
  const folder = params.get("folder");
  const group = params.get("group");
  if (folder === "search" || params.get("q")) { elements.search.value = params.get("q") || ""; openSearch(); searchAllApps(); }
  else if (folder && FOLDER_DETAILS[folder] && !FOLDER_GROUPS[folder]) openFolder(folder, { focus: false });
  else if (group && FOLDER_GROUPS[group]) openGroup(group, { focus: false });
  else showFolders({ focus: false });
  renderDock();
  renderProjectPaths();
}

elements.folderGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-folder]");
  if (!button) return;
  const folderId = button.dataset.folder;
  if (FOLDER_GROUPS[folderId]) openGroup(folderId, { scroll: true });
  else openFolder(folderId, { scroll: true });
});

[elements.appGrid, elements.dockApps].forEach((container) => container.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tool-id]");
  if (button) launchTool(toolById.get(button.dataset.toolId));
}));

elements.back.addEventListener("click", () => {
  if (!elements.appsView.hidden && state.group) openGroup(state.group);
  else showFolders();
});
elements.searchToggle.addEventListener("click", () => elements.searchPanel.hidden ? openSearch() : closeSearch());
elements.search.addEventListener("input", searchAllApps);
elements.clearSearch.addEventListener("click", () => {
  elements.search.value = "";
  state.query = "";
  elements.clearSearch.hidden = true;
  renderApps();
  updateHash();
  elements.search.focus();
});

function refreshFilters() {
  elements.accessExplanation.textContent = ACCESS_HELP[state.access];
  if (elements.appsView.hidden) {
    renderFolders(state.group ? FOLDER_GROUPS[state.group] : FOLDER_ORDER);
    elements.location.textContent = folderLocationText();
  } else renderApps();
  renderDock();
  renderProjectPaths();
  updateHash();
}
elements.grade.addEventListener("change", () => { state.grade = elements.grade.value; refreshFilters(); });
elements.access.addEventListener("change", () => { state.access = elements.access.value; refreshFilters(); });
elements.resetFilters.addEventListener("click", () => {
  state.grade = "all";
  state.query = "";
  elements.grade.value = "all";
  elements.search.value = "";
  elements.clearSearch.hidden = true;
  refreshFilters();
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

const PROGRESS_KEY = "classroomos-launchpad-progress-v1";
let projectProgress = {};
try {
  const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  if (saved && typeof saved === "object" && !Array.isArray(saved)) projectProgress = saved;
} catch { /* The checklist also works when storage is unavailable. */ }
function saveProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(projectProgress)); }
  catch { document.getElementById("progress-note").textContent = "Storage is unavailable. Checkmarks last for this visit only. Download your project files before leaving."; }
}
function renderProjectPaths() {
  const list = document.getElementById("project-path-list");
  const openIds = new Set([...list.querySelectorAll("details[open]")].map(el => el.id));
  list.replaceChildren();
  projectPaths.filter(path => state.grade === "all" || path.grades.includes(state.grade)).forEach(path => {
    const details = document.createElement("details");
    details.className = "project-path";
    details.id = `project-${path.id}`;
    details.open = openIds.has(details.id);
    const summary = document.createElement("summary");
    summary.textContent = path.title;
    const links = document.createElement("p");
    links.className = "path-tools";
    path.tools.forEach(id => {
      const tool = toolById.get(id);
      const link = document.createElement("a");
      link.href = tool.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = tool.label;
      links.append(link);
    });
    const starter = document.createElement("a");
    starter.href = path.starter;
    starter.download = "";
    starter.textContent = path.starterLabel;
    const steps = document.createElement("ol");
    path.steps.forEach((step, index) => {
      const li = document.createElement("li");
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      const key = `${path.id}-${index}`;
      input.checked = projectProgress[key] === true;
      input.addEventListener("change", () => {
        projectProgress[key] = input.checked;
        saveProgress();
        const complete = path.steps.filter((_, i) => projectProgress[`${path.id}-${i}`] === true).length;
        document.getElementById("project-progress-status").textContent = `${path.title}: ${complete} of 4 steps checked.`;
      });
      const text = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = ["Start. ","Create. ","Save. ","Return. "][index];
      text.append(strong, step);
      label.append(input, text);
      li.append(label);
      steps.append(li);
    });
    details.append(summary, links, starter, steps);
    list.append(details);
  });
}
document.getElementById("clear-project-progress").addEventListener("click", () => {
  projectProgress = {};
  saveProgress();
  renderProjectPaths();
  document.getElementById("project-progress-status").textContent = "Project checkmarks cleared. Your downloaded files are unchanged.";
});
window.addEventListener("hashchange", () => {
  if (location.hash === "#project-paths") return;
  restoreFromHash();
});
restoreFromHash();
