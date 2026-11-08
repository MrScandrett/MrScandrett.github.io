/**
 * skin-registry.js — the Skin layer of Theme → Skin → Background.
 *
 *   Theme       colors (--bg, --text, --accent…) and a default skin + background
 *   Skin        shape: corners, borders, shadows, glass, UI fonts, press/hover feel
 *   Background  what's drawn behind the page (canvas-bg.js)
 *
 * Contract: a skin never sets a color. It only mixes the theme's tokens
 * (var(--text), var(--accent), white/black/transparent), so every skin works
 * with every theme. tests/skins.test.mjs enforces this on the CSS files.
 *
 * The logo (.brand) is always Classroom Chicago; skins can change every other
 * font but never that one.
 *
 * Resolution: a skin is either pinned by the visitor (localStorage
 * "classroomos-skin") or follows the theme's `defaultSkin` (theme-registry.js).
 * theme-registry.js runs the first apply synchronously in <head> so the page
 * never paints in the wrong skin; this file is the full API, loaded after it.
 *
 * Each skin with `css: true` lives in assets/css/skins/<id>.css and is only
 * fetched while chosen, together with skins/skin-core.css (the shared token
 * plumbing). Links are media="screen", so printing always uses the default.
 */
(function (root) {
  if (root.ClassroomOSSkins && root.ClassroomOSSkins.apply) return;
  var SKINS = [
    {
      id: "glass",
      label: "Liquid Glass",
      detail: "The official ClassroomOS look: frosted panels and soft corners.",
      era: "Glassmorphism, 2020s",
      icon: "◌",
      css: false,
      preview: { radius: "12px", control: "999px", border: "1px solid", shadow: "0 6px 14px -8px", font: "inherit" }
    },
    {
      id: "terminal",
      label: "Terminal",
      detail: "CRT scanlines, glowing corner frames and reverse-video terminal controls.",
      era: "Command line, 1970s–80s",
      icon: ">_",
      css: true,
      preview: { radius: "0", control: "0", border: "1px solid", shadow: "inset 0 0 12px -6px", font: "\"JetBrains Mono\", ui-monospace, monospace" }
    },
    {
      id: "blocky",
      label: "Blocky",
      detail: "Silver inventory windows, stone buttons, item slots and black text boxes.",
      era: "Voxel game menus, 2010s",
      icon: "▦",
      css: true,
      preview: { radius: "0", control: "0", border: "3px solid", shadow: "3px 3px 0 0", font: "\"Pixelify Sans\", \"Classroom Chicago\", monospace" }
    },
    {
      id: "notebook",
      label: "Notebook",
      detail: "Pen-drawn frames, pencil-hatched buttons and handwritten controls.",
      era: "Skeuomorphism, 2000s",
      icon: "✎",
      css: true,
      preview: { radius: "2px", control: "255px 15px 225px 15px / 15px 225px 15px 255px", border: "2px solid", shadow: "0 4px 6px -4px", font: "\"Patrick Hand\", cursive" }
    },
    {
      id: "underwater",
      label: "Underwater",
      detail: "Luminous glass, pearly reflections and glossy water-clear controls.",
      era: "Frutiger Aero, 2000s",
      icon: "◍",
      css: true,
      preview: { radius: "22px", control: "999px", border: "1px solid", shadow: "inset 0 -8px 14px -10px", font: "Lexend, inherit" }
    }
  ];

  var DEFAULT_SKIN = "glass";
  var STORAGE_KEY = "classroomos-skin";
  var CHANGE_EVENT = "classroomos:skinchange";

  var byId = {};
  var ids = [];
  SKINS.forEach(function (skin) { byId[skin.id] = skin; ids.push(skin.id); });

  function isValid(id) { return Object.prototype.hasOwnProperty.call(byId, id); }
  function normalize(id) { return isValid(id) ? id : DEFAULT_SKIN; }
  function get(id) { return byId[normalize(id)]; }

  /* Pure: what skin a page should wear. `pinned` wins; otherwise the theme's default. */
  function resolve(themeId, pinned, themeRegistry) {
    if (pinned && isValid(pinned)) return pinned;
    var reg = themeRegistry || root.ClassroomOSThemeRegistry;
    var theme = reg && typeof reg.get === "function" ? reg.get(themeId) : null;
    var fromTheme = theme && theme.defaultSkin;
    return isValid(fromTheme) ? fromTheme : DEFAULT_SKIN;
  }

  var api = {
    SKINS: SKINS,
    IDS: ids,
    DEFAULT: DEFAULT_SKIN,
    STORAGE_KEY: STORAGE_KEY,
    CHANGE_EVENT: CHANGE_EVENT,
    isValid: isValid,
    normalize: normalize,
    get: get,
    resolve: resolve
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  root.ClassroomOSSkins = api;
  if (!root.document) return;

  var doc = root.document;
  var html = doc.documentElement;

  function independent() {
    return html.dataset.themeScope === "independent" || (doc.body && doc.body.dataset.themeScope === "independent");
  }
  function readPinned() {
    try { var v = root.localStorage.getItem(STORAGE_KEY); return isValid(v) ? v : null; } catch (_) { return null; }
  }
  function writePinned(id) {
    try {
      if (id) root.localStorage.setItem(STORAGE_KEY, id);
      else root.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }
  function currentTheme() {
    return html.dataset.theme || "day";
  }
  var ownScript = doc.currentScript || doc.querySelector('script[src*="skin-registry.js"]');
  var SKINS_BASE = ownScript && ownScript.src ? new URL("../css/skins/", ownScript.src).href : "/assets/css/skins/";
  function skinsBase() { return SKINS_BASE; }

  function motionStill() {
    var reduced = false;
    try { reduced = root.localStorage.getItem("classroomos-reduced-motion") === "on"; } catch (_) {}
    return reduced || html.hasAttribute("data-classroom-presentation");
  }
  function syncMotion() {
    if (motionStill()) html.setAttribute("data-skin-motion", "still");
    else html.removeAttribute("data-skin-motion");
  }

  var sheets = {};
  function prepareSheet(href) {
    if (sheets[href]) return sheets[href];
    var link = Array.prototype.find.call(doc.querySelectorAll('link[rel="stylesheet"]'), function (item) { return item.href === href; });
    if (!link) {
      link = doc.createElement("link");
      link.rel = "stylesheet";
      link.media = "not all";
      link.href = href;
    }
    var ready = link.sheet ? Promise.resolve(link) : new Promise(function (resolve, reject) {
      link.addEventListener("load", function () { resolve(link); }, { once: true });
      link.addEventListener("error", function () {
        delete sheets[href];
        link.remove();
        reject(new Error("Skin stylesheet could not load: " + href));
      }, { once: true });
    });
    sheets[href] = ready;
    if (!link.isConnected) doc.head.appendChild(link);
    return ready;
  }

  function activateSheet(attr, link) {
    var previous = doc.querySelector("link[" + attr + "]");
    if (previous && previous !== link) {
      previous.media = "not all";
      previous.removeAttribute(attr);
    }
    if (link) {
      link.setAttribute(attr, "");
      link.media = "screen";
    }
  }

  function loadSurfaces() {
    if (root.ClassroomOSSkinSurfaces || doc.querySelector("script[data-classroomos-skin-surfaces]")) return;
    var script = doc.createElement("script");
    script.src = new URL("skin-surfaces.js", ownScript && ownScript.src ? ownScript.src : root.location.href).href;
    script.defer = true;
    script.dataset.classroomosSkinSurfaces = "true";
    doc.head.appendChild(script);
  }

  var applied = html.getAttribute("data-skin");
  var appliedPinned = html.getAttribute("data-skin-source") === "pinned";
  var requestVersion = 0;
  function apply() {
    var version = ++requestVersion;
    if (independent()) {
      html.removeAttribute("data-skin");
      html.removeAttribute("data-skin-source");
      applied = null;
      appliedPinned = false;
      activateSheet("data-classroomos-skin-core", null);
      activateSheet("data-classroomos-skin", null);
      return null;
    }
    var pinned = readPinned();
    var id = resolve(currentTheme(), pinned);
    var skin = get(id);
    var base = skinsBase();
    function commit(links) {
      // A later click always wins, even when an earlier stylesheet loads last.
      if (version !== requestVersion) return;
      activateSheet("data-classroomos-skin-core", links && links[0]);
      activateSheet("data-classroomos-skin", links && links[1]);
      if (html.getAttribute("data-skin") !== id) html.setAttribute("data-skin", id);
      html.setAttribute("data-skin-source", pinned ? "pinned" : "theme");
      syncMotion();
      if (skin.css) loadSurfaces();
      if (id !== applied || !!pinned !== appliedPinned) {
        var previous = applied;
        applied = id;
        appliedPinned = !!pinned;
        root.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { skin: id, previous: previous, pinned: !!pinned } }));
      }
    }
    // Keep the current skin intact until BOTH replacement sheets are ready.
    if (skin.css) {
      Promise.all([prepareSheet(base + "skin-core.css"), prepareSheet(base + id + ".css")]).then(commit).catch(function () {
        // Leave the working skin visible on a failed request; retry on next pick.
      });
    } else commit(null);
    return id;
  }

  api.current = function () { return html.getAttribute("data-skin") || resolve(currentTheme(), readPinned()); };
  api.pinned = readPinned;
  api.themeDefault = function (themeId) { return resolve(themeId || currentTheme(), null); };
  /* Pin a skin (survives theme changes). Passing the theme's own default still pins it. */
  api.set = function (id) { if (!isValid(id)) return api.current(); writePinned(id); return apply(); };
  /* Un-pin: go back to whatever the current theme suggests. */
  api.follow = function () { writePinned(null); return apply(); };
  api.apply = apply;

  apply();

  new MutationObserver(function () { apply(); }).observe(html, { attributes: true, attributeFilter: ["data-theme", "data-classroom-presentation"] });
  root.addEventListener("storage", function (event) {
    if (!event || event.key === STORAGE_KEY || event.key === "classroomos-reduced-motion" || event.key === null) apply();
  });
  root.addEventListener("classroomos:reducedmotionchange", syncMotion);
})(typeof window !== "undefined" ? window : globalThis);
