"use strict";

let editor;
let currentFilePath = null;
let previewEntryPath = null;
let availableFiles = [];
let serverSaveEnabled = false;
let showAllFiles = false;
let projectEntryPath = null;
let projectScope = new Set();
let editMode = "code";
let suppressPreviewSync = false;
const savedContents = new Map();
const drafts = new Map();
const elements = {};
const editorApi = "/api";

const visualOverlayStyle = `
[data-oe-block] { position: relative; }
[data-oe-block].oe-hover, [data-oe-block].oe-selected { outline: 2px dashed #1676bd; outline-offset: 2px; }
[data-oe-block].oe-dragging { opacity: 0.4; }
.oe-handle { position: absolute; top: 4px; left: 4px; z-index: 99998; display: none; gap: 4px; }
[data-oe-block]:hover .oe-handle, [data-oe-block].oe-selected .oe-handle { display: flex; }
.oe-handle button {
  cursor: pointer; border: 1px solid #1676bd; background: #fff; color: #1676bd;
  border-radius: 4px; font-size: 12px; line-height: 1; padding: 3px 6px; font-family: sans-serif;
}
.oe-handle button:hover { background: #eaf4fd; }
.oe-handle button:active { background: #1676bd; color: #fff; }
[data-oe-editable]:hover, [data-oe-editable]:focus {
  outline: 1px dashed #f2b84b; outline-offset: 1px; cursor: text;
}
[data-oe-block] img, [data-oe-block] video {
  touch-action: none; max-width: 100%;
}
[data-oe-block] img:hover, [data-oe-block] video:hover, .oe-resizing {
  outline: 2px dashed #62a9de; outline-offset: 2px; cursor: nwse-resize;
}
.oe-resize-tag {
  position: absolute; z-index: 99998; background: #1676bd; color: #fff;
  font: 11px -apple-system, BlinkMacSystemFont, sans-serif; padding: 2px 5px;
  border-radius: 3px; pointer-events: none; transform: translate(4px, 4px);
}
`;

const visualOverlayScript = `
(function () {
  var doc = document;
  function topBlocks() {
    var root = doc.querySelector("main") || doc.body;
    return Array.prototype.filter.call(root.children, function (el) {
      return !/^(SCRIPT|STYLE|LINK|BASE)$/.test(el.tagName);
    });
  }
  function isLeafText(el) {
    if (!el.textContent || !el.textContent.trim()) return false;
    return !el.querySelector("*");
  }
  function markEditable(root) {
    var selector = "h1,h2,h3,h4,h5,h6,p,span,a,button,li,figcaption,label";
    root.querySelectorAll(selector).forEach(function (el) {
      if (el.closest(".oe-handle")) return;
      if (!isLeafText(el)) return;
      el.setAttribute("contenteditable", "true");
      el.setAttribute("data-oe-editable", "");
      if (el.tagName === "A" || el.tagName === "BUTTON") {
        el.addEventListener("click", function (event) { event.preventDefault(); });
      }
    });
  }
  function cleanClone() {
    var clone = doc.documentElement.cloneNode(true);
    clone.querySelectorAll(".oe-handle, #oe-toolbar, [data-oe-style], [data-oe-script], [data-oe-vendor]").forEach(function (el) { el.remove(); });
    clone.querySelectorAll("img, video").forEach(function (el) {
      el.classList.remove("oe-resizing");
      el.removeAttribute("data-oe-resizable");
    });
    clone.querySelectorAll("[data-oe-block]").forEach(function (el) {
      el.removeAttribute("data-oe-block");
      el.removeAttribute("draggable");
      el.classList.remove("oe-selected", "oe-dragging");
      if (!el.getAttribute("class")) el.removeAttribute("class");
    });
    clone.querySelectorAll("[data-oe-editable]").forEach(function (el) {
      el.removeAttribute("data-oe-editable");
      el.removeAttribute("contenteditable");
    });
    return clone.outerHTML;
  }

  // ---- Undo/redo history. Design canvas edits sync into the Monaco model via
  // editor.setValue(), which discards Monaco's OWN undo stack every time --
  // so without this, an accidental deletion in Design canvas mode was
  // unrecoverable. This keeps its own snapshot stack independent of Monaco.
  var historyStack = [];
  var historyIndex = -1;
  var MAX_HISTORY = 50;
  var restoringHistory = false;
  function pushHistory(html) {
    if (restoringHistory) return;
    if (historyStack[historyIndex] === html) return;
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(html);
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    historyIndex = historyStack.length - 1;
  }
  function restoreSnapshot(html) {
    restoringHistory = true;
    var parsed = new DOMParser().parseFromString(html, "text/html");
    doc.body.innerHTML = parsed.body.innerHTML;
    topBlocks().forEach(wireBlock);
    markEditable(doc.body);
    wireResizable(doc.body);
    restoringHistory = false;
    parent.postMessage({ type: "oe-sync", html: html }, "*");
  }
  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreSnapshot(historyStack[historyIndex]);
  }
  function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex++;
    restoreSnapshot(historyStack[historyIndex]);
  }
  function sync() {
    clearTimeout(window.__oeSyncTimer);
    window.__oeSyncTimer = setTimeout(function () {
      var html = cleanClone();
      pushHistory(html);
      parent.postMessage({ type: "oe-sync", html: html }, "*");
    }, 400);
  }
  function selectBlock(block) {
    doc.querySelectorAll("[data-oe-block]").forEach(function (b) { b.classList.remove("oe-selected"); });
    if (block) block.classList.add("oe-selected");
  }
  function getSelectedBlock() {
    return doc.querySelector("[data-oe-block].oe-selected");
  }
  function moveBlock(block, direction) {
    var parentEl = block.parentElement;
    if (direction < 0 && block.previousElementSibling) {
      parentEl.insertBefore(block, block.previousElementSibling);
    } else if (direction > 0 && block.nextElementSibling) {
      parentEl.insertBefore(block.nextElementSibling, block);
    }
  }
  function duplicateBlock(block) {
    var clone = block.cloneNode(true);
    block.parentElement.insertBefore(clone, block.nextSibling);
    markEditable(clone);
    wireBlock(clone);
    // cloneNode copies the data-oe-resizable *attribute* but interact.js's
    // binding is per-element and isn't cloned, so clear the flag before
    // rewiring or the clone's images/video would silently lose resizing.
    (clone.matches && clone.matches("img,video") ? [clone] : Array.prototype.slice.call(clone.querySelectorAll("img,video")))
      .forEach(function (el) { delete el.dataset.oeResizable; });
    wireResizable(clone);
    selectBlock(clone);
    return clone;
  }
  function removeBlock(block) {
    var wasSelected = block.classList.contains("oe-selected");
    block.remove();
    if (wasSelected) selectBlock(null);
  }
  function wireBlock(block) {
    block.setAttribute("data-oe-block", "");
    block.setAttribute("draggable", "true");
    var handle = doc.createElement("div");
    handle.className = "oe-handle";
    handle.innerHTML =
      '<button type="button" data-act="up" title="Move up">\\u2191</button>' +
      '<button type="button" data-act="down" title="Move down">\\u2193</button>' +
      '<button type="button" data-act="dup" title="Duplicate">\\u29C9</button>' +
      '<button type="button" data-act="del" title="Remove">\\u00D7</button>';
    handle.addEventListener("mousedown", function (event) { event.stopPropagation(); });
    handle.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) return;
      event.stopPropagation();
      if (button.dataset.act === "up") moveBlock(block, -1);
      else if (button.dataset.act === "down") moveBlock(block, 1);
      else if (button.dataset.act === "dup") duplicateBlock(block);
      else if (button.dataset.act === "del") removeBlock(block);
      sync();
    });
    block.prepend(handle);
    block.addEventListener("click", function (event) {
      if (event.target.closest(".oe-handle")) return;
      selectBlock(block);
    });
    block.addEventListener("dragstart", function () { block.classList.add("oe-dragging"); });
    block.addEventListener("dragend", function () { block.classList.remove("oe-dragging"); sync(); });
    block.addEventListener("dragover", function (event) { event.preventDefault(); });
    block.addEventListener("drop", function (event) {
      event.preventDefault();
      var dragging = doc.querySelector(".oe-dragging");
      if (!dragging || dragging === block) return;
      var rect = block.getBoundingClientRect();
      var before = event.clientY - rect.top < rect.height / 2;
      block.parentElement.insertBefore(dragging, before ? block : block.nextSibling);
    });
  }
  topBlocks().forEach(wireBlock);
  markEditable(doc.body);
  doc.body.addEventListener("input", function (event) {
    if (event.target.hasAttribute && event.target.hasAttribute("data-oe-editable")) sync();
  });
  // A native prompt()/confirm() in the PARENT page (e.g. the Link tool asking
  // for a URL) force-blurs this iframe's document.activeElement to <body>
  // while it's open -- unlike an ordinary focus change, it doesn't restore
  // afterward. Track the last real editable focus so toolbar commands that
  // resolve after a dialog closes still know what they're acting on.
  var lastEditableEl = null;
  doc.body.addEventListener("focusin", function (event) {
    if (event.target && event.target.hasAttribute && event.target.hasAttribute("data-oe-editable")) {
      lastEditableEl = event.target;
    }
  });

  // ---- Image/video resizing, via interact.js (MIT license, interactjs.io) ----
  function wireResizable(root) {
    if (!window.interact) return;
    var els = (root.matches && root.matches("img,video")) ? [root] : Array.prototype.slice.call(root.querySelectorAll("img,video"));
    els.forEach(function (el) {
      if (el.dataset.oeResizable !== undefined) return;
      el.dataset.oeResizable = "";
      interact(el).resizable({
        edges: { right: true, bottom: true },
        margin: 12,
        modifiers: [interact.modifiers.restrictSize({ min: { width: 40, height: 30 } })],
        listeners: {
          start: function () { el.classList.add("oe-resizing"); },
          move: function (event) {
            el.style.width = event.rect.width + "px";
            el.style.height = event.rect.height + "px";
          },
          end: function () { el.classList.remove("oe-resizing"); sync(); }
        }
      });
    });
  }
  wireResizable(doc.body);
  pushHistory(cleanClone());

  // ---- Design toolbar: fonts, colors, gradients, images, video, hotkeys ----
  function getActiveEditable() {
    var el = doc.activeElement;
    if (el && el.hasAttribute && el.hasAttribute("data-oe-editable")) return el;
    return (lastEditableEl && doc.body.contains(lastEditableEl)) ? lastEditableEl : null;
  }
  function insertionTarget() {
    return getSelectedBlock() || topBlocks()[topBlocks().length - 1] || doc.body;
  }
  function toggleTextCommand(cmd, styleProp, onValue, offValue) {
    var editable = getActiveEditable();
    if (editable && doc.getSelection && !doc.getSelection().isCollapsed) {
      doc.execCommand(cmd, false, null);
      sync();
      return;
    }
    var target = editable || getSelectedBlock();
    if (!target) return;
    target.style[styleProp] = target.style[styleProp] === onValue ? offValue : onValue;
    sync();
  }
  function applyAlign(value) {
    var target = getActiveEditable() || getSelectedBlock();
    if (!target) return;
    target.style.textAlign = value;
    sync();
  }
  function applyFontFamily(value) {
    var target = getActiveEditable() || getSelectedBlock();
    if (!target) return;
    target.style.fontFamily = value;
    sync();
  }
  function applyFontSize(px) {
    var target = getActiveEditable() || getSelectedBlock();
    if (!target || !px) return;
    target.style.fontSize = px + "px";
    sync();
  }
  function applyTextColor(color) {
    var target = getActiveEditable() || getSelectedBlock();
    if (!target) return;
    target.style.color = color;
    sync();
  }
  function applyFillColor(color) {
    var target = getSelectedBlock();
    if (!target) return;
    target.style.backgroundImage = "none";
    target.style.backgroundColor = color;
    sync();
  }
  function applyGradient(colorA, colorB) {
    var target = getSelectedBlock();
    if (!target) return;
    target.style.backgroundColor = "";
    target.style.backgroundImage = "linear-gradient(135deg, " + colorA + ", " + colorB + ")";
    sync();
  }
  function applyLink(url) {
    var target = getActiveEditable();
    if (!target) return;
    if (!url) {
      if (target.tagName === "A") {
        var parent = target.parentNode;
        while (target.firstChild) parent.insertBefore(target.firstChild, target);
        parent.removeChild(target);
      } else {
        doc.execCommand("unlink", false, null);
      }
      sync();
      return;
    }
    if (target.tagName === "A") {
      target.setAttribute("href", url);
    } else if (doc.getSelection && !doc.getSelection().isCollapsed) {
      doc.execCommand("createLink", false, url);
    } else {
      var link = doc.createElement("a");
      link.href = url;
      while (target.firstChild) link.appendChild(target.firstChild);
      target.appendChild(link);
    }
    sync();
  }
  // ---- Box model: padding, margin, border, radius, shadow, opacity. Applies
  // to the selected panel, the one part of the CSS box model the toolbar
  // couldn't touch before -- text/color/image edits only ever set properties
  // Monaco's own model already had a picker for.
  function applyPadding(px) {
    var target = getSelectedBlock();
    if (!target || px === "" || px === null) return;
    target.style.padding = px + "px";
    sync();
  }
  function applyMargin(px) {
    var target = getSelectedBlock();
    if (!target || px === "" || px === null) return;
    target.style.margin = px + "px";
    sync();
  }
  function applyRadius(px) {
    var target = getSelectedBlock();
    if (!target || px === "" || px === null) return;
    target.style.borderRadius = px + "px";
    sync();
  }
  function applyOpacity(percent) {
    var target = getSelectedBlock();
    if (!target || percent === "" || percent === null) return;
    var clamped = Math.max(0, Math.min(100, Number(percent)));
    target.style.opacity = String(clamped / 100);
    sync();
  }
  function applyBorder(spec) {
    var target = getSelectedBlock();
    if (!target) return;
    var width = Number(spec && spec.width);
    if (!width) {
      target.style.border = "none";
    } else {
      target.style.border = width + "px " + spec.style + " " + spec.color;
    }
    sync();
  }
  var SHADOW_PRESETS = {
    none: "none",
    small: "0 1px 3px rgba(0, 0, 0, 0.25)",
    medium: "0 4px 12px rgba(0, 0, 0, 0.25)",
    large: "0 12px 34px rgba(0, 0, 0, 0.3)"
  };
  function applyShadow(preset) {
    var target = getSelectedBlock();
    if (!target) return;
    target.style.boxShadow = SHADOW_PRESETS[preset] || "none";
    sync();
  }
  // The design toolbar itself lives in the parent OSeditor page (outside this
  // previewed document) so it can never cover previewed content. It drives
  // these same functions via postMessage.
  var commandMap = {
    bold: function () { toggleTextCommand("bold", "fontWeight", "bold", "normal"); },
    italic: function () { toggleTextCommand("italic", "fontStyle", "italic", "normal"); },
    underline: function () { toggleTextCommand("underline", "textDecoration", "underline", "none"); },
    align: function (value) { applyAlign(value); },
    fontFamily: function (value) { applyFontFamily(value); },
    fontSize: function (value) { applyFontSize(value); },
    textColor: function (value) { applyTextColor(value); },
    fill: function (value) { applyFillColor(value); },
    gradient: function (value) { applyGradient(value.colorA, value.colorB); },
    link: function (value) { applyLink(value); },
    padding: function (value) { applyPadding(value); },
    margin: function (value) { applyMargin(value); },
    radius: function (value) { applyRadius(value); },
    opacity: function (value) { applyOpacity(value); },
    border: function (value) { applyBorder(value); },
    shadow: function (value) { applyShadow(value); },
    insertImage: function (value) { insertImageDataUrl(value); },
    insertVideo: function (value) { insertVideoDataUrl(value); },
    undo: function () { undo(); },
    redo: function () { redo(); }
  };
  function insertImageDataUrl(value) {
    var src = typeof value === "string" ? value : value.src;
    var alt = (value && typeof value === "object" && value.alt) ? value.alt : "";
    var img = doc.createElement("img");
    img.src = src;
    img.alt = alt;
    img.style.maxWidth = "100%";
    insertionTarget().appendChild(img);
    wireResizable(img);
    sync();
  }
  function insertVideoDataUrl(dataUrl) {
    var video = doc.createElement("video");
    video.src = dataUrl;
    video.controls = true;
    video.style.maxWidth = "100%";
    insertionTarget().appendChild(video);
    wireResizable(video);
    sync();
  }
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "oe-command") return;
    var handler = commandMap[event.data.cmd];
    if (handler) handler(event.data.value);
  });

  doc.addEventListener("keydown", function (event) {
    var mod = event.ctrlKey || event.metaKey;
    var editing = !!getActiveEditable();
    if (mod && !event.shiftKey && !event.altKey && (event.key === "b" || event.key === "B")) {
      event.preventDefault(); toggleTextCommand("bold", "fontWeight", "bold", "normal");
    } else if (mod && (event.key === "i" || event.key === "I")) {
      event.preventDefault(); toggleTextCommand("italic", "fontStyle", "italic", "normal");
    } else if (mod && (event.key === "u" || event.key === "U")) {
      event.preventDefault(); toggleTextCommand("underline", "textDecoration", "underline", "none");
    } else if (mod && !event.shiftKey && (event.key === "z" || event.key === "Z")) {
      event.preventDefault(); undo();
    } else if (mod && ((event.shiftKey && (event.key === "z" || event.key === "Z")) || event.key === "y" || event.key === "Y")) {
      event.preventDefault(); redo();
    } else if (mod && (event.key === "d" || event.key === "D")) {
      var selected = getSelectedBlock();
      if (selected) { event.preventDefault(); duplicateBlock(selected); sync(); }
    } else if (mod && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      var block = getSelectedBlock();
      if (block) { event.preventDefault(); moveBlock(block, event.key === "ArrowUp" ? -1 : 1); sync(); }
    } else if (!editing && (event.key === "Delete" || event.key === "Backspace")) {
      var toRemove = getSelectedBlock();
      if (toRemove) { event.preventDefault(); removeBlock(toRemove); sync(); }
    } else if (event.key === "Escape") {
      selectBlock(null);
    }
  });
})();
`;

document.addEventListener("DOMContentLoaded", async () => {
  Object.assign(elements, {
    tree: document.getElementById("file-tree"),
    filter: document.getElementById("file-filter"),
    currentName: document.getElementById("current-file-name"),
    frame: document.getElementById("preview-frame"),
    status: document.getElementById("editor-status"),
    save: document.getElementById("btn-save"),
    download: document.getElementById("btn-download"),
    refresh: document.getElementById("btn-refresh-preview"),
    importButton: document.getElementById("btn-import"),
    importInput: document.getElementById("workspace-import"),
    modeMessage: document.getElementById("mode-message"),
    modeBanner: document.getElementById("mode-banner"),
    projectSelect: document.getElementById("project-select"),
    guide: document.getElementById("guide-content"),
    modeCode: document.getElementById("mode-code"),
    modeVisual: document.getElementById("mode-visual"),
    designToolbar: document.getElementById("design-toolbar"),
    unsavedBadge: document.getElementById("unsaved-badge"),
    autosaveBanner: document.getElementById("autosave-banner"),
    discardAutosave: document.getElementById("btn-discard-autosave")
  });

  elements.save.disabled = true;
  elements.download.disabled = true;
  elements.filter.addEventListener("input", renderFileList);
  elements.refresh.addEventListener("click", updatePreview);
  elements.save.addEventListener("click", saveToServer);
  elements.download.addEventListener("click", downloadWorkspace);
  elements.modeCode.addEventListener("click", () => setEditMode("code"));
  elements.modeVisual.addEventListener("click", () => setEditMode("visual"));
  window.addEventListener("message", handleVisualSyncMessage);
  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });
  elements.discardAutosave.addEventListener("click", () => {
    writeAutosaveStore({});
    location.reload();
  });
  wireDesignToolbar();
  wireAssetBrowser();
  wireFindInFiles();
  wirePreviewWidth();
  elements.guide.addEventListener("click", (event) => {
    const location = event.target.closest("[data-coach-line]");
    if (!location || !editor) return;
    const lineNumber = Number(location.dataset.coachLine);
    editor.revealLineInCenter(lineNumber);
    editor.setPosition({ lineNumber, column: 1 });
    editor.focus();
    setStatus(`Moved to line ${lineNumber} in ${currentFilePath}.`);
  });
  elements.importButton.addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", importWorkspace);
  elements.projectSelect.addEventListener("change", () => {
    if (elements.projectSelect.value === "__all__") {
      showAllFiles = true;
      projectScope = new Set();
      renderFileList();
      renderGuide();
      setStatus(`Showing the complete editable source tree: ${availableFiles.length} files.`);
    } else if (elements.projectSelect.value) {
      activateProject(elements.projectSelect.value);
    }
  });

  try {
    const [, config] = await Promise.all([initMonaco(), loadConfiguration(), loadFiles()]);
    serverSaveEnabled = config.saveEnabled;
    elements.save.disabled = true;
    elements.save.title = config.saveEnabled
      ? "Save this file to the repository"
      : "Restart the local server with ADMIN_PASS set to enable saving";
    elements.download.disabled = false;
    populateProjectSelect();
    elements.modeBanner.textContent = config.saveEnabled
      ? "Edits stay temporary until downloaded or written to source with your password. Review Git changes before committing."
      : "Edits stay temporary. Download a workspace ZIP to keep them; restart with ADMIN_PASS to enable Write to source.";
    setStatus(config.saveEnabled
      ? "Editor ready. Choose a page to begin; source writing requires your password."
      : "Editor ready. Choose a page to begin; source writing is currently disabled.");
    await restoreAutosave();
  } catch (error) {
    console.error("OSeditor failed to start", error);
  }
});

function setStatus(message) {
  elements.status.textContent = message;
}

function initMonaco() {
  return new Promise((resolve, reject) => {
    window.require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs" } });
    window.require(["vs/editor/editor.main"], () => {
      editor = window.monaco.editor.create(document.getElementById("editor-container"), {
        value: "<!-- Select a file from the explorer -->\n",
        language: "html",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        accessibilitySupport: "auto"
      });

      let timeout;
      editor.onDidChangeModelContent(() => {
        if (!currentFilePath) return;
        rememberCurrentDraft();
        if (suppressPreviewSync) return;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          updatePreview();
          renderGuide();
        }, 600);
      });
      resolve();
    }, (error) => {
      console.error("Monaco failed to load", error);
      setStatus("The code editor could not load. Check the network connection and reload.");
      reject(error);
    });
  });
}

async function loadConfiguration() {
  try {
    const response = await fetch(`${editorApi}/editor-config`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Could not read editor configuration", error);
    return { saveEnabled: false };
  }
}

async function loadFiles() {
  try {
    const response = await fetch(`${editorApi}/files`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    availableFiles = await response.json();
    renderFileList();
  } catch (error) {
    console.error("Failed to load files", error);
    elements.tree.innerHTML = '<li class="file-message">Files could not be loaded.</li>';
    setStatus("Files could not be loaded. Is serve-local.js running?");
  }
}

function projectCategory(filePath) {
  if (filePath.startsWith("/student-projects/")) return "Student projects";
  if (filePath.startsWith("/lessons/")) return "Lessons";
  if (filePath.split("/").filter(Boolean).length === 1) return "Site pages";
  return "Other pages";
}

function projectLabel(filePath) {
  return filePath.replace(/^\//, "").replace(/\.html$/i, "").replace(/[-_]/g, " ");
}

function populateProjectSelect() {
  const previousValue = elements.projectSelect.value;
  elements.projectSelect.replaceChildren(
    new Option("Choose a starting page…", ""),
    new Option("Entire ClassroomOS source", "__all__")
  );
  const groups = new Map();
  for (const filePath of availableFiles.filter((path) => path.endsWith(".html"))) {
    const category = projectCategory(filePath);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(filePath);
  }
  for (const category of ["Site pages", "Lessons", "Student projects", "Other pages"]) {
    const paths = groups.get(category);
    if (!paths?.length) continue;
    const group = document.createElement("optgroup");
    group.label = category;
    for (const filePath of paths) group.appendChild(new Option(projectLabel(filePath), filePath));
    elements.projectSelect.appendChild(group);
  }
  if ([...elements.projectSelect.options].some((option) => option.value === previousValue)) {
    elements.projectSelect.value = previousValue;
  }
}

async function ensureFileLoaded(filePath) {
  if (drafts.has(filePath)) return drafts.get(filePath);
  const response = await fetch(filePath, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${filePath}: HTTP ${response.status}`);
  const content = await response.text();
  savedContents.set(filePath, content);
  drafts.set(filePath, content);
  return content;
}

function studentProjectRoot(entryPath) {
  const parts = entryPath.split("/").filter(Boolean);
  if (parts[0] !== "student-projects" || parts.length < 3) return null;
  return `/${parts.slice(0, 3).join("/")}/`;
}

async function activateProject(entryPath) {
  try {
    await ensureFileLoaded(entryPath);
    projectEntryPath = entryPath;
    previewEntryPath = entryPath;
    showAllFiles = false;
    projectScope = buildProjectScope(entryPath);
    elements.projectSelect.value = entryPath;
    renderFileList();
    await openFile(entryPath);
    renderGuide();
    setStatus(`Workspace ready: ${projectScope.size} connected file${projectScope.size === 1 ? "" : "s"}.`);
  } catch (error) {
    console.error("Could not build project workspace", error);
    setStatus(error.message);
  }
}

function buildProjectScope(entryPath) {
  const scope = new Set([entryPath]);
  const rootPrefix = studentProjectRoot(entryPath);
  if (rootPrefix) {
    for (const filePath of availableFiles) if (filePath.startsWith(rootPrefix)) scope.add(filePath);
  }
  const html = drafts.get(entryPath);
  if (!html) return scope;
  const model = new DOMParser().parseFromString(html, "text/html");
  for (const element of model.querySelectorAll("link[href], script[src]")) {
    const reference = element.getAttribute("href") || element.getAttribute("src");
    const localPath = resolveProjectPath(reference, entryPath);
    if (localPath && availableFiles.includes(localPath)) scope.add(localPath);
  }
  return scope;
}

function renderFileList() {
  updateUnsavedBadge();
  const query = elements.filter.value.trim().toLowerCase();
  const source = showAllFiles ? availableFiles : [...projectScope];
  const matches = source.filter((filePath) => filePath.toLowerCase().includes(query)).sort();
  elements.tree.replaceChildren();

  if (!matches.length) {
    const message = document.createElement("li");
    message.className = "file-message";
    message.textContent = projectScope.size || showAllFiles
      ? "No matching files."
      : "Choose a page or project above.";
    elements.tree.appendChild(message);
    return;
  }

  for (const filePath of matches) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = filePath;
    button.title = filePath;
    button.dataset.path = filePath;
    button.classList.toggle("active", filePath === currentFilePath);
    button.classList.toggle("dirty", isDirty(filePath));
    if (filePath === currentFilePath) button.setAttribute("aria-current", "true");
    button.addEventListener("click", () => openFile(filePath));
    item.appendChild(button);
    elements.tree.appendChild(item);
  }
}

async function openFile(filePath) {
  if (!editor) return;
  rememberCurrentDraft();
  currentFilePath = filePath;
  elements.currentName.textContent = filePath;
  renderFileList();

  try {
    await ensureFileLoaded(filePath);

    const extension = extensionOf(filePath);
    const languages = { js: "javascript", mjs: "javascript", css: "css", json: "json", md: "markdown" };
    window.monaco.editor.setModelLanguage(editor.getModel(), languages[extension] || "html");
    editor.setValue(drafts.get(filePath));
    editor.focus();
    if (extension === "html") {
      previewEntryPath = filePath;
      if (showAllFiles) {
        projectEntryPath = filePath;
        projectScope = buildProjectScope(filePath);
      }
    }
    elements.save.disabled = !serverSaveEnabled;
    updatePreview();
    renderGuide();
    setStatus(`Opened ${filePath}`);
  } catch (error) {
    console.error("Failed to open file", error);
    setStatus(`Could not open ${filePath}`);
  }
}

function rememberCurrentDraft() {
  if (!editor || !currentFilePath) return;
  drafts.set(currentFilePath, editor.getValue());
  const button = elements.tree.querySelector(`[data-path="${window.CSS.escape(currentFilePath)}"]`);
  if (button) button.classList.toggle("dirty", isDirty(currentFilePath));
  persistAutosave();
}

// ---- Autosave: drafts live only in memory, so a reload/crash previously lost
// everything silently (the incident that made this necessary). Dirty drafts
// are mirrored to localStorage so they survive a reload of this same browser.
const AUTOSAVE_KEY = "oseditor:autosave:v1";

function isDirty(filePath) {
  return drafts.has(filePath) && drafts.get(filePath) !== savedContents.get(filePath);
}

function hasUnsavedChanges() {
  for (const filePath of drafts.keys()) {
    if (isDirty(filePath)) return true;
  }
  return false;
}

function readAutosaveStore() {
  try {
    return JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAutosaveStore(store) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Could not write autosave to localStorage", error);
  }
}

let autosaveTimer;
function persistAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const store = {};
    for (const [filePath, content] of drafts) {
      if (isDirty(filePath)) store[filePath] = content;
    }
    writeAutosaveStore(store);
    updateUnsavedBadge();
  }, 500);
}

function updateUnsavedBadge() {
  if (!elements.unsavedBadge) return;
  const count = [...drafts.keys()].filter(isDirty).length;
  elements.unsavedBadge.hidden = count === 0;
  elements.unsavedBadge.textContent = count ? `${count} unsaved file${count === 1 ? "" : "s"}` : "";
}

async function restoreAutosave() {
  const store = readAutosaveStore();
  const paths = Object.keys(store).filter((filePath) => availableFiles.includes(filePath));
  if (!paths.length) return;
  for (const filePath of paths) {
    try {
      const response = await fetch(filePath, { cache: "no-store" });
      if (response.ok) savedContents.set(filePath, await response.text());
    } catch (error) {
      console.error(`Could not fetch original for ${filePath} while restoring autosave`, error);
    }
    drafts.set(filePath, store[filePath]);
  }
  elements.autosaveBanner.hidden = false;
  setStatus(`Restored ${paths.length} unsaved file${paths.length === 1 ? "" : "s"} from a previous session in this browser.`);
  renderFileList();
}

function extensionOf(filePath) {
  return filePath.split(".").pop().toLowerCase();
}

function resolveProjectPath(reference, fromPath) {
  try {
    const url = new URL(reference, `${window.location.origin}${fromPath}`);
    return url.origin === window.location.origin ? decodeURIComponent(url.pathname) : null;
  } catch {
    return null;
  }
}

function updatePreview() {
  rememberCurrentDraft();
  if (!previewEntryPath || !drafts.has(previewEntryPath)) {
    elements.frame.srcdoc = "<!doctype html><html><body><p style='font-family:sans-serif'>Open an HTML file to start the preview.</p></body></html>";
    return;
  }

  const documentModel = new DOMParser().parseFromString(drafts.get(previewEntryPath), "text/html");
  documentModel.querySelector("base[data-oseditor-base]")?.remove();
  const base = documentModel.createElement("base");
  const directory = previewEntryPath.slice(0, previewEntryPath.lastIndexOf("/") + 1);
  base.href = `${window.location.origin}${directory}`;
  base.dataset.oseditorBase = "";
  documentModel.head.prepend(base);

  for (const link of documentModel.querySelectorAll('link[rel~="stylesheet"][href]')) {
    const localPath = resolveProjectPath(link.getAttribute("href"), previewEntryPath);
    if (localPath && drafts.has(localPath)) {
      const style = documentModel.createElement("style");
      style.dataset.editorSource = localPath;
      style.textContent = drafts.get(localPath);
      link.replaceWith(style);
    }
  }

  for (const script of documentModel.querySelectorAll("script[src]")) {
    const localPath = resolveProjectPath(script.getAttribute("src"), previewEntryPath);
    if (localPath && drafts.has(localPath)) {
      const inlineScript = documentModel.createElement("script");
      inlineScript.dataset.editorSource = localPath;
      inlineScript.textContent = drafts.get(localPath).replace(/<\/script/gi, "<\\/script");
      script.replaceWith(inlineScript);
    }
  }

  if (editMode === "visual") {
    const styleTag = documentModel.createElement("style");
    styleTag.dataset.oeStyle = "";
    styleTag.textContent = visualOverlayStyle;
    documentModel.head.appendChild(styleTag);
    // interact.js (MIT, https://interactjs.io/) powers the corner resize handles
    // on images/video below. Loaded before the inline overlay script so it's
    // ready by the time that script runs (classic <script> tags execute in
    // document order while the iframe parses the srcdoc).
    const vendorScript = documentModel.createElement("script");
    vendorScript.dataset.oeVendor = "";
    vendorScript.src = "https://cdn.jsdelivr.net/npm/interactjs@1.10.28/dist/interact.min.js";
    documentModel.body.appendChild(vendorScript);
    const scriptTag = documentModel.createElement("script");
    scriptTag.dataset.oeScript = "";
    scriptTag.textContent = visualOverlayScript;
    documentModel.body.appendChild(scriptTag);
  }

  elements.frame.srcdoc = `<!doctype html>\n${documentModel.documentElement.outerHTML}`;
}

function setEditMode(mode) {
  if (mode === editMode) return;
  editMode = mode;
  elements.modeCode.classList.toggle("active", mode === "code");
  elements.modeCode.setAttribute("aria-pressed", String(mode === "code"));
  elements.modeVisual.classList.toggle("active", mode === "visual");
  elements.modeVisual.setAttribute("aria-pressed", String(mode === "visual"));
  document.querySelector(".oseditor-container").classList.toggle("mode-visual-active", mode === "visual");
  updatePreview();
  setStatus(mode === "visual"
    ? "Design canvas active. Drag a panel's handle to reorder it, click any text to type directly, or use ↑ ↓ ⧉ × to rearrange, duplicate, or remove a panel."
    : "Code preview restored.");
}

function handleVisualSyncMessage(event) {
  if (!elements.frame || event.source !== elements.frame.contentWindow) return;
  if (!event.data || event.data.type !== "oe-sync") return;
  if (!previewEntryPath) return;

  const html = `<!doctype html>\n${event.data.html}`;
  drafts.set(previewEntryPath, html);
  if (currentFilePath === previewEntryPath && editor) {
    suppressPreviewSync = true;
    editor.setValue(html);
    suppressPreviewSync = false;
  }
  persistAutosave();
  renderFileList();
  renderGuide();
}

function sendDesignCommand(cmd, value) {
  if (!elements.frame || !elements.frame.contentWindow) return;
  elements.frame.contentWindow.postMessage({ type: "oe-command", cmd, value }, "*");
}

function wireDesignToolbar() {
  const toolbar = elements.designToolbar;
  if (!toolbar) return;

  document.getElementById("dt-undo").addEventListener("click", () => sendDesignCommand("undo"));
  document.getElementById("dt-redo").addEventListener("click", () => sendDesignCommand("redo"));

  toolbar.querySelectorAll("[data-tb]").forEach((button) => {
    button.addEventListener("click", () => sendDesignCommand(button.dataset.tb));
  });
  toolbar.querySelectorAll("[data-align]").forEach((button) => {
    button.addEventListener("click", () => sendDesignCommand("align", button.dataset.align));
  });
  document.getElementById("dt-font").addEventListener("change", (event) => {
    if (event.target.value) sendDesignCommand("fontFamily", event.target.value);
  });
  document.getElementById("dt-fontsize").addEventListener("change", (event) => {
    if (event.target.value) sendDesignCommand("fontSize", event.target.value);
  });
  document.getElementById("dt-color-text").addEventListener("input", (event) => {
    sendDesignCommand("textColor", event.target.value);
  });
  document.getElementById("dt-fill").addEventListener("click", () => {
    sendDesignCommand("fill", document.getElementById("dt-color-a").value);
  });
  document.getElementById("dt-gradient").addEventListener("click", () => {
    sendDesignCommand("gradient", {
      colorA: document.getElementById("dt-color-a").value,
      colorB: document.getElementById("dt-color-b").value
    });
  });
  document.getElementById("dt-link").addEventListener("click", () => {
    const url = window.prompt("Link URL (leave blank and OK to remove an existing link):", "https://");
    if (url === null) return;
    sendDesignCommand("link", url.trim());
  });

  document.getElementById("dt-padding").addEventListener("change", (event) => {
    if (event.target.value !== "") sendDesignCommand("padding", event.target.value);
  });
  document.getElementById("dt-margin").addEventListener("change", (event) => {
    if (event.target.value !== "") sendDesignCommand("margin", event.target.value);
  });
  document.getElementById("dt-radius").addEventListener("change", (event) => {
    if (event.target.value !== "") sendDesignCommand("radius", event.target.value);
  });
  document.getElementById("dt-opacity").addEventListener("change", (event) => {
    if (event.target.value !== "") sendDesignCommand("opacity", event.target.value);
  });
  document.getElementById("dt-apply-border").addEventListener("click", () => {
    sendDesignCommand("border", {
      width: document.getElementById("dt-border-width").value,
      style: document.getElementById("dt-border-style").value,
      color: document.getElementById("dt-border-color").value
    });
  });
  document.getElementById("dt-remove-border").addEventListener("click", () => {
    sendDesignCommand("border", { width: 0 });
  });
  document.getElementById("dt-shadow").addEventListener("change", (event) => {
    sendDesignCommand("shadow", event.target.value);
  });

  const wireFilePicker = (buttonId, inputId, cmd, promptAlt) => {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    button.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      const file = input.files[0];
      input.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (promptAlt) {
          const alt = window.prompt("Alt text for this image (describes it for screen readers; can leave blank):", "") || "";
          sendDesignCommand(cmd, { src: reader.result, alt });
        } else {
          sendDesignCommand(cmd, reader.result);
        }
      };
      reader.readAsDataURL(file);
    });
  };
  wireFilePicker("dt-insert-image", "dt-file-image", "insertImage", true);
  wireFilePicker("dt-insert-video", "dt-file-video", "insertVideo", false);
}

let assetFilesCache = null;
async function ensureAssetFiles() {
  if (assetFilesCache) return assetFilesCache;
  try {
    const response = await fetch(`${editorApi}/assets`, { cache: "no-store" });
    assetFilesCache = response.ok ? await response.json() : [];
  } catch (error) {
    console.error("Could not load image assets", error);
    assetFilesCache = [];
  }
  return assetFilesCache;
}

function renderAssetBrowser(query) {
  const grid = document.getElementById("asset-browser-grid");
  const needle = (query || "").trim().toLowerCase();
  const items = (assetFilesCache || []).filter((assetPath) => assetPath.toLowerCase().includes(needle)).slice(0, 200);
  grid.replaceChildren();
  if (!items.length) {
    const message = document.createElement("p");
    message.className = "asset-browser-message";
    message.textContent = "No matching images.";
    grid.appendChild(message);
    return;
  }
  for (const assetPath of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "asset-browser-item";
    button.title = assetPath;
    const img = document.createElement("img");
    img.src = assetPath;
    img.alt = "";
    img.loading = "lazy";
    const label = document.createElement("span");
    label.textContent = assetPath.split("/").pop();
    button.append(img, label);
    button.addEventListener("click", () => {
      sendDesignCommand("insertImage", { src: assetPath, alt: "" });
      document.getElementById("asset-browser").hidden = true;
    });
    grid.appendChild(button);
  }
}

function wireAssetBrowser() {
  const panel = document.getElementById("asset-browser");
  const browseButton = document.getElementById("dt-browse-image");
  const filterInput = document.getElementById("asset-browser-filter");
  if (!panel || !browseButton) return;

  browseButton.addEventListener("click", async () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      await ensureAssetFiles();
      renderAssetBrowser(filterInput.value);
      filterInput.focus();
    }
  });
  document.getElementById("asset-browser-close").addEventListener("click", () => {
    panel.hidden = true;
  });
  filterInput.addEventListener("input", () => renderAssetBrowser(filterInput.value));
}

function wirePreviewWidth() {
  const previewPane = document.querySelector(".preview-pane");
  const modes = ["desktop", "tablet", "mobile"];
  const setPreviewWidth = (mode) => {
    if (mode === "desktop") previewPane.removeAttribute("data-preview-width");
    else previewPane.dataset.previewWidth = mode;
    modes.forEach((candidate) => {
      const button = document.getElementById(`pw-${candidate}`);
      button.classList.toggle("active", candidate === mode);
      button.setAttribute("aria-pressed", String(candidate === mode));
    });
  };
  modes.forEach((mode) => {
    document.getElementById(`pw-${mode}`).addEventListener("click", () => setPreviewWidth(mode));
  });
}

const SEARCHABLE_EXTENSION = /\.(html|css|js|mjs|json|md)$/i;

async function searchInFiles(query) {
  const resultsList = document.getElementById("find-files-results");
  const replaceAllButton = document.getElementById("find-files-replace-all");
  resultsList.replaceChildren();
  replaceAllButton.disabled = true;
  if (!query) return;

  const scope = showAllFiles || !projectScope.size ? availableFiles : [...projectScope];
  const needle = query.toLowerCase();
  let totalMatches = 0;
  const matchedFiles = new Set();

  for (const filePath of scope) {
    if (!SEARCHABLE_EXTENSION.test(filePath)) continue;
    let content;
    try {
      content = await ensureFileLoaded(filePath);
    } catch (error) {
      continue;
    }
    const lines = content.split("\n");
    lines.forEach((line, lineIndex) => {
      if (line.toLowerCase().indexOf(needle) === -1) return;
      totalMatches++;
      matchedFiles.add(filePath);
      if (resultsList.children.length >= 200) return;

      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      const pathEl = document.createElement("span");
      pathEl.className = "find-files-path";
      pathEl.textContent = `${filePath}:${lineIndex + 1}`;
      const snippetEl = document.createElement("span");
      snippetEl.className = "find-files-snippet";
      snippetEl.textContent = line.trim().slice(0, 140);
      button.append(pathEl, snippetEl);
      button.addEventListener("click", async () => {
        await openFile(filePath);
        setEditMode("code");
        editor.revealLineInCenter(lineIndex + 1);
        editor.setPosition({ lineNumber: lineIndex + 1, column: 1 });
        editor.focus();
      });
      li.appendChild(button);
      resultsList.appendChild(li);
    });
  }

  setStatus(totalMatches
    ? `${totalMatches} match${totalMatches === 1 ? "" : "es"} in ${matchedFiles.size} file${matchedFiles.size === 1 ? "" : "s"}.`
    : "No matches found.");
  replaceAllButton.disabled = totalMatches === 0;
}

async function replaceAllInFiles(query, replacement) {
  if (!query) return;
  const scope = showAllFiles || !projectScope.size ? availableFiles : [...projectScope];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "gi");
  let filesChanged = 0;
  let occurrences = 0;

  for (const filePath of scope) {
    if (!SEARCHABLE_EXTENSION.test(filePath)) continue;
    let content;
    try {
      content = await ensureFileLoaded(filePath);
    } catch (error) {
      continue;
    }
    pattern.lastIndex = 0;
    const matches = content.match(pattern);
    if (!matches) continue;

    occurrences += matches.length;
    filesChanged++;
    const updated = content.replace(pattern, replacement);
    drafts.set(filePath, updated);
    if (filePath === currentFilePath && editor) {
      suppressPreviewSync = true;
      editor.setValue(updated);
      suppressPreviewSync = false;
    }
  }

  persistAutosave();
  renderFileList();
  if (currentFilePath && drafts.has(currentFilePath)) updatePreview();
  setStatus(`Replaced ${occurrences} occurrence${occurrences === 1 ? "" : "s"} across ${filesChanged} file${filesChanged === 1 ? "" : "s"}.`);
}

function wireFindInFiles() {
  const toggleButton = document.getElementById("btn-find-files");
  const panel = document.getElementById("find-files-panel");
  const queryInput = document.getElementById("find-files-query");
  const replacementInput = document.getElementById("find-files-replacement");
  if (!toggleButton || !panel) return;

  toggleButton.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) queryInput.focus();
  });
  document.getElementById("find-files-search").addEventListener("click", () => {
    searchInFiles(queryInput.value.trim());
  });
  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchInFiles(queryInput.value.trim());
  });
  document.getElementById("find-files-replace-all").addEventListener("click", () => {
    const query = queryInput.value.trim();
    const replacement = replacementInput.value;
    if (!query) return;
    const confirmed = window.confirm(
      `Replace all matches of "${query}" with "${replacement}" across the searched files?\n\nThis edits drafts in the editor only — nothing is written to disk until you use Write to source.`
    );
    if (confirmed) replaceAllInFiles(query, replacement);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function fileRole(filePath) {
  const extension = extensionOf(filePath);
  if (extension === "html") return "Page structure and written content";
  if (extension === "css") return "Colors, spacing, typography, and responsive layout";
  if (extension === "js" || extension === "mjs") return "Interaction, state, animation, and data flow";
  if (extension === "json") return "Structured content or configuration";
  if (extension === "md") return "Documentation and design notes";
  return "Supporting source";
}

function lineNumberFor(content, pattern) {
  const match = content.match(pattern);
  if (!match || match.index === undefined) return null;
  return content.slice(0, match.index).split("\n").length;
}

function detectCodePatterns(filePath, content) {
  const extension = extensionOf(filePath);
  const patterns = [];
  const recipes = [];
  const addPattern = (test, name, meaning) => {
    if (test.test(content)) patterns.push({ name, meaning });
  };
  const addRecipe = (pattern, goal, instruction) => {
    const line = lineNumberFor(content, pattern);
    if (line) recipes.push({ goal, instruction, location: `${filePath}:${line}` });
  };

  if (extension === "html") {
    addPattern(/<nav\b/i, "Navigation", "A navigation region connects this page to other destinations.");
    addPattern(/<(?:main|section|article)\b/i, "Semantic regions", "Named document regions give the page structure and improve accessibility.");
    addPattern(/<(?:button|input|select|textarea|form)\b/i, "User controls", "Controls collect input or trigger behavior.");
    addPattern(/<(?:canvas|svg)\b/i, "Programmed visual", "Canvas or SVG creates a diagram, simulation, game, or illustration.");
    addPattern(/\baria-[\w-]+=/i, "Accessibility labels", "ARIA communicates interface meaning when native HTML needs extra help.");
    addPattern(/\bdata-[\w-]+=/i, "Data attributes", "Custom data values connect HTML elements to JavaScript behavior.");
    addPattern(/<script[^>]+type=["']module["']/i, "JavaScript modules", "Module scripts can import and organize reusable code.");
    addRecipe(/<title\b[^>]*>/i, "Rename the browser tab", "Edit the text between <title> and </title>.");
    addRecipe(/<h1\b[^>]*>/i, "Change the page's main message", "Edit the first <h1>. Keep one clear main heading.");
    addRecipe(/<(?:button|a)\b[^>]*>/i, "Change a visible action", "Edit the control's text first; preserve its attributes so its behavior stays connected.");
    addRecipe(/<(?:main|section|article)\b[^>]*>/i, "Rearrange the page", "Move one complete semantic region, then verify reading and keyboard order in the preview.");
  } else if (extension === "css") {
    addPattern(/--[\w-]+\s*:/, "Design tokens", "CSS custom properties hold reusable colors, sizes, or spacing values.");
    addPattern(/display\s*:\s*flex/i, "Flexbox", "Flexbox arranges items along a row or column.");
    addPattern(/display\s*:\s*grid/i, "CSS Grid", "Grid controls rows and columns as a two-dimensional layout.");
    addPattern(/@media\b/i, "Responsive breakpoint", "A media query changes the design for a screen size or user preference.");
    addPattern(/@keyframes\b|animation\s*:/i, "Animation", "Keyframes and animation properties create timed visual change.");
    addPattern(/:(?:hover|focus|focus-visible|active)\b/i, "Interaction state", "Pseudo-classes style an element when someone points, focuses, or activates it.");
    addPattern(/clamp\s*\(/i, "Fluid sizing", "clamp() lets a value grow with the viewport between safe limits.");
    addRecipe(/--[\w-]+\s*:/, "Change the visual system", "Edit a custom property value. Search for its name to see everywhere it is reused.");
    addRecipe(/(?:background(?:-color)?|color)\s*:/i, "Change a color", "Edit one color declaration, then check text contrast and interaction states.");
    addRecipe(/display\s*:\s*(?:grid|flex)/i, "Change the layout", "Adjust gap, grid-template-columns, flex-direction, alignment, or wrapping near this declaration.");
    addRecipe(/@media\b/i, "Improve the mobile design", "Edit rules inside this media query and resize the browser to test the breakpoint.");
    addRecipe(/font-family\s*:/i, "Change the page's voice", "Change the font stack here and verify that body text remains easy to read.");
  } else if (extension === "js" || extension === "mjs") {
    addPattern(/addEventListener\s*\(/, "Event-driven behavior", "An event listener runs code after a click, key press, input, or browser event.");
    addPattern(/querySelector(?:All)?\s*\(/, "DOM selection", "JavaScript finds HTML elements so it can read or change them.");
    addPattern(/\b(?:async\s+function|await\s+)/, "Asynchronous work", "Async code waits for files, network responses, or other delayed work.");
    addPattern(/\bfetch\s*\(/, "Data loading", "fetch() requests content or data from another route.");
    addPattern(/localStorage\b/, "Saved browser state", "localStorage remembers values on this browser between visits.");
    addPattern(/requestAnimationFrame\s*\(/, "Render loop", "A render loop updates animation or a simulation before browser frames.");
    addPattern(/getContext\s*\(|\bTHREE\b|Matter\./, "Graphics engine", "This code draws or simulates a visual experience.");
    addPattern(/\bclass\s+[A-Z]/, "Object-oriented structure", "A class groups related state and behavior into reusable objects.");
    addRecipe(/addEventListener\s*\(/, "Change what an interaction does", "Find the listener's callback and edit one statement inside it. Keep the event name until you understand the trigger.");
    addRecipe(/querySelector(?:All)?\s*\(/, "Connect behavior to another element", "Change the selector only after finding the matching id or class in the HTML.");
    addRecipe(/\bconst\s+[A-Za-z_$][\w$]*\s*=/, "Change a starting value", "Edit the value on the right side of this constant, reload the preview, and compare the result.");
    addRecipe(/\b(?:render|draw|update|animate)\s*(?:=|\()/i, "Change what gets drawn", "Trace this render or update function. Alter one visual value at a time.");
  } else if (extension === "json") {
    addPattern(/^\s*[\[{]/, "Structured data", "JSON stores named values and lists without page behavior.");
    addRecipe(/"[^"\n]+"\s*:/, "Change structured content", "Edit a value after the colon. Keep quotes, commas, and brackets balanced.");
  } else if (extension === "md") {
    addPattern(/^#{1,6}\s+/m, "Document headings", "Markdown headings organize documentation into a readable hierarchy.");
    addPattern(/\[[^\]]+\]\([^)]+\)/, "Linked reference", "Markdown links connect documentation to another resource.");
    addRecipe(/^#{1,6}\s+/m, "Reshape the explanation", "Edit a heading and the paragraphs beneath it while preserving heading order.");
  }
  return { patterns, recipes };
}

function renderGuide() {
  if (!projectEntryPath || !drafts.has(projectEntryPath)) {
    elements.guide.innerHTML = "<p>Choose a page or project to see its structure, connected files, and safe experiments.</p>";
    return;
  }

  const model = new DOMParser().parseFromString(drafts.get(projectEntryPath), "text/html");
  const title = model.querySelector("title")?.textContent.trim() || projectLabel(projectEntryPath);
  const description = model.querySelector('meta[name="description"]')?.content.trim()
    || model.querySelector("main p, body p")?.textContent.trim()
    || "This page combines document structure, presentation, and browser behavior.";
  const counts = {
    sections: model.querySelectorAll("main, section, article").length,
    controls: model.querySelectorAll("button, input, select, textarea, a[href]").length,
    canvases: model.querySelectorAll("canvas, svg").length,
    forms: model.querySelectorAll("form").length
  };
  const currentContent = currentFilePath ? drafts.get(currentFilePath) || "" : "";
  const analysis = currentFilePath ? detectCodePatterns(currentFilePath, currentContent) : { patterns: [], recipes: [] };
  const sharedFiles = [...projectScope].filter((path) => path.startsWith("/assets/"));
  const fileItems = [...projectScope].sort().map((path) =>
    `<div class="guide-file"><strong>${escapeHtml(path)}</strong><br>${escapeHtml(fileRole(path))}</div>`
  ).join("");

  elements.guide.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(description.slice(0, 360))}</p>
    <h3>What Code Coach recognizes</h3>
    <p><strong>${escapeHtml(currentFilePath || projectEntryPath)}</strong> — ${escapeHtml(fileRole(currentFilePath || projectEntryPath))}</p>
    ${analysis.patterns.length
      ? `<div class="pattern-list">${analysis.patterns.map((pattern) => `<span class="pattern-chip" title="${escapeHtml(pattern.meaning)}">${escapeHtml(pattern.name)}</span>`).join("")}</div><ul>${analysis.patterns.map((pattern) => `<li><strong>${escapeHtml(pattern.name)}:</strong> ${escapeHtml(pattern.meaning)}</li>`).join("")}</ul>`
      : "<p>No major pattern has been detected in this file yet. Small files may simply provide content or configuration.</p>"}
    <h3>What to edit</h3>
    ${analysis.recipes.length
      ? analysis.recipes.map((recipe) => {
        const lineNumber = Number(recipe.location.split(":").pop());
        return `<div class="coach-recipe"><strong>${escapeHtml(recipe.goal)}</strong><br>${escapeHtml(recipe.instruction)}<br><button class="coach-location" type="button" data-coach-line="${lineNumber}">Go to ${escapeHtml(recipe.location)}</button></div>`;
      }).join("")
      : "<p>Open an HTML, CSS, or JavaScript file to receive targeted change recipes.</p>"}
    <h3>Page anatomy</h3>
    <p>${counts.sections} content region${counts.sections === 1 ? "" : "s"}, ${counts.controls} interactive or linked control${counts.controls === 1 ? "" : "s"}, ${counts.canvases} visual canvas or SVG, and ${counts.forms} form${counts.forms === 1 ? "" : "s"}.</p>
    <h3>Connected source</h3>
    ${fileItems || "<p>Only the entry page is currently connected.</p>"}
    ${sharedFiles.length ? '<p class="guide-warning">Shared asset files may affect more than this page. Preview first, write deliberately, and review the Git diff after changing shared code.</p>' : ""}
    <h3>How the preview runs</h3>
    <p>OSeditor rebuilds the selected HTML page inside an isolated frame. Opened CSS and JavaScript drafts replace their saved versions there, while the classroom site stays unchanged.</p>`;
}

async function saveToServer() {
  if (!editor || !currentFilePath || elements.save.disabled) return;
  rememberCurrentDraft();
  const confirmed = window.confirm(`Write ${currentFilePath} to the source repository on this computer?\n\nThis is the step that makes the edit permanent locally.`);
  if (!confirmed) {
    setStatus("Source write canceled. Your draft is still available in the editor.");
    return;
  }
  const password = window.prompt("Teacher access required. Enter the server password:");
  if (!password) return;

  elements.save.disabled = true;
  setStatus(`Saving ${currentFilePath}…`);
  try {
    const response = await fetch(`${editorApi}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: currentFilePath, content: drafts.get(currentFilePath), password })
    });
    if (!response.ok) throw new Error(await response.text());
    savedContents.set(currentFilePath, drafts.get(currentFilePath));
    persistAutosave();
    renderFileList();
    setStatus(`Saved ${currentFilePath}`);
  } catch (error) {
    console.error("Save error", error);
    setStatus(`Save failed: ${error.message}`);
  } finally {
    elements.save.disabled = !serverSaveEnabled || !currentFilePath;
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const u16 = (value) => [value & 255, (value >>> 8) & 255];
  const u32 = (value) => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];

  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name.replace(/^\//, ""));
    const data = encoder.encode(content);
    const checksum = crc32(data);
    const local = new Uint8Array([80, 75, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0, 0, ...u32(checksum), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), 0, 0, ...nameBytes]);
    chunks.push(local, data);
    central.push(new Uint8Array([80, 75, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0, 0, ...u32(checksum), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(offset), ...nameBytes]));
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array([80, 75, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), 0, 0]);
  return new Blob([...chunks, ...central, end], { type: "application/zip" });
}

async function readZipEntries(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  let endOffset = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      endOffset = index;
      break;
    }
  }
  if (endOffset < 0) throw new Error("This is not a readable ZIP workspace.");

  const entryCount = view.getUint16(endOffset + 10, true);
  let centralOffset = view.getUint32(endOffset + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map();
  let totalBytes = 0;

  if (entryCount > 500) throw new Error("This workspace contains too many files.");
  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (view.getUint32(centralOffset, true) !== 0x02014b50) throw new Error("The ZIP directory is damaged.");
    const method = view.getUint16(centralOffset + 10, true);
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const uncompressedSize = view.getUint32(centralOffset + 24, true);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const name = decoder.decode(bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength));
    centralOffset += 46 + nameLength + extraLength + commentLength;

    if (!name || name.endsWith("/")) continue;
    if (name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) {
      throw new Error("The ZIP contains an unsafe file path.");
    }
    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("A ZIP file entry is damaged.");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    let contentBytes;
    if (method === 0) {
      contentBytes = compressed;
    } else if (method === 8 && typeof DecompressionStream === "function") {
      try {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        contentBytes = new Uint8Array(await new Response(stream).arrayBuffer());
      } catch {
        throw new Error("This compressed ZIP format is not supported by this browser. Re-export it from OSeditor.");
      }
    } else {
      throw new Error("This ZIP uses an unsupported compression method.");
    }
    if (contentBytes.length !== uncompressedSize) throw new Error(`The ZIP entry ${name} is incomplete.`);
    totalBytes += contentBytes.length;
    if (totalBytes > 8 * 1024 * 1024) throw new Error("This workspace is larger than the 8 MB import limit.");
    entries.set(name, decoder.decode(contentBytes));
  }
  return entries;
}

async function importWorkspace() {
  const file = elements.importInput.files?.[0];
  elements.importInput.value = "";
  if (!file) return;
  setStatus(`Opening ${file.name}…`);
  try {
    const entries = await readZipEntries(await file.arrayBuffer());
    let manifest = {};
    if (entries.has(".oseditor-workspace.json")) {
      try {
        manifest = JSON.parse(entries.get(".oseditor-workspace.json"));
      } catch {
        throw new Error("The OSeditor workspace manifest is invalid.");
      }
      entries.delete(".oseditor-workspace.json");
    }

    const importedPaths = [];
    for (const [name, content] of entries) {
      const filePath = `/${name}`;
      if (!/\.(html|css|js|mjs|json|md)$/i.test(filePath)) continue;
      drafts.set(filePath, content);
      savedContents.set(filePath, null);
      if (!availableFiles.includes(filePath)) availableFiles.push(filePath);
      importedPaths.push(filePath);
    }
    if (!importedPaths.length) throw new Error("The ZIP contains no editable HTML, CSS, JavaScript, JSON, or Markdown files.");

    projectScope = new Set(importedPaths);
    showAllFiles = false;
    projectEntryPath = importedPaths.includes(manifest.entryPath) ? manifest.entryPath : importedPaths.find((path) => path.endsWith(".html")) || importedPaths[0];
    previewEntryPath = projectEntryPath.endsWith(".html") ? projectEntryPath : null;
    populateProjectSelect();
    const importedOption = new Option(`Imported: ${file.name}`, projectEntryPath, true, true);
    elements.projectSelect.appendChild(importedOption);
    renderFileList();
    await openFile(projectEntryPath);
    renderGuide();
    setStatus(`Reopened ${importedPaths.length} workspace file${importedPaths.length === 1 ? "" : "s"}. Use Write to source only when you intend to update the repository.`);
  } catch (error) {
    console.error("Workspace import failed", error);
    setStatus(`Workspace could not be opened: ${error.message}`);
  }
}

async function downloadWorkspace() {
  rememberCurrentDraft();
  const filePaths = projectScope.size ? [...projectScope] : [...drafts.keys()];
  if (!filePaths.length) {
    setStatus("Open at least one file before downloading a workspace.");
    return;
  }

  elements.download.disabled = true;
  setStatus("Collecting the workspace files…");
  try {
    await Promise.all(filePaths.map(ensureFileLoaded));
  } catch (error) {
    elements.download.disabled = false;
    setStatus(error.message);
    return;
  }
  const manifest = JSON.stringify({
    format: "OSeditor-workspace",
    version: 1,
    entryPath: projectEntryPath,
    files: filePaths,
    exportedAt: new Date().toISOString()
  }, null, 2);
  const zipFiles = filePaths.map((path) => [path, drafts.get(path)]);
  zipFiles.push([".oseditor-workspace.json", manifest]);
  const blob = makeZip(zipFiles);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "OSeditor-workspace.zip";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  elements.download.disabled = false;
  setStatus(`Downloaded ${filePaths.length} file${filePaths.length === 1 ? "" : "s"} as a reopenable workspace ZIP.`);
}
