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
      detail: "Monospace text, square double-line frames and [ bracket ] buttons.",
      era: "Command line, 1970s–80s",
      icon: ">_",
      css: true,
      preview: { radius: "0", control: "0", border: "3px double", shadow: "none", font: "\"JetBrains Mono\", ui-monospace, monospace" }
    },
    {
      id: "blocky",
      label: "Blocky",
      detail: "Stair-step pixel edges and chunky buttons that press down.",
      era: "Pixel art, 1980s–90s",
      icon: "▦",
      css: true,
      preview: { radius: "0", control: "0", border: "3px solid", shadow: "3px 3px 0 0", font: "\"Pixelify Sans\", \"Classroom Chicago\", monospace" }
    },
    {
      id: "notebook",
      label: "Notebook",
      detail: "Graph paper, taped cards, sketchy buttons and handwritten headings.",
      era: "Skeuomorphism, 2000s",
      icon: "✎",
      css: true,
      preview: { radius: "2px", control: "255px 15px 225px 15px / 15px 225px 15px 255px", border: "2px solid", shadow: "0 4px 6px -4px", font: "\"Patrick Hand\", cursive" }
    },
    {
      id: "underwater",
      label: "Underwater",
      detail: "Bubble-round panels that bob gently and ripple when pressed.",
      era: "Organic UI",
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

  function setLink(attr, href) {
    var link = doc.querySelector("link[" + attr + "]");
    if (!href) { if (link) link.remove(); return; }
    if (link && link.href === href) return;
    if (!link) {
      link = doc.createElement("link");
      link.rel = "stylesheet";
      link.media = "screen";
      link.setAttribute(attr, "");
      doc.head.appendChild(link);
    }
    link.href = href;
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
  function apply() {
    if (independent()) {
      html.removeAttribute("data-skin");
      setLink("data-classroomos-skin-core", null);
      setLink("data-classroomos-skin", null);
      return null;
    }
    var pinned = readPinned();
    var id = resolve(currentTheme(), pinned);
    var skin = get(id);
    var base = skinsBase();
    html.setAttribute("data-skin", id);
    html.setAttribute("data-skin-source", pinned ? "pinned" : "theme");
    setLink("data-classroomos-skin-core", skin.css ? base + "skin-core.css" : null);
    setLink("data-classroomos-skin", skin.css ? base + id + ".css" : null);
    syncMotion();
    if (skin.css) loadSurfaces();
    if (id !== applied) {
      var previous = applied;
      applied = id;
      root.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { skin: id, previous: previous, pinned: !!pinned } }));
    }
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
