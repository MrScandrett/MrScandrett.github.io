/**
 * theme-registry.js — single source of truth for theme identity.
 *
 * Everything that used to know the list of themes by heart (theme-lighting.js's
 * FOUC-avoiding engine, nav-mobile.js's settings panel, canvas-bg.js's accent
 * colors) reads it from here instead. Load this before both theme-lighting.js
 * and nav-mobile.js.
 */
(function (root) {
  var THEMES = [
    { id: "day",         label: "Day",         detail: "Clean and bright — the default ClassroomOS look.",      tone: "light", swatch: ["#dff1ff", "#6eb6ff"],                     accentRGB: [0, 113, 227], mandelSwatch: ["#020b17", "#004b99", "#0071e3", "#7cd0ff"] },
    { id: "sakura",      label: "Sakura",      detail: "Cherry blossom pink with a soft spring glow.",           tone: "light", swatch: ["#fff7fb", "#ff85b2"],                     accentRGB: [220, 80, 150], mandelSwatch: ["#13020b", "#731346", "#ff6b9d", "#ffd4e5"] },
    { id: "diamond",     label: "Diamond",     detail: "Icy teal blue — crisp, cool, and focused.",              tone: "light", swatch: ["#eafcff", "#087985"],                     accentRGB: [80, 190, 255], mandelSwatch: ["#020d18", "#004c66", "#00c6ff", "#d0f8ff"] },
    { id: "emerald",     label: "Emerald",     detail: "Fresh leaf green — calm and easy on the eyes.",          tone: "light", swatch: ["#f4fff7", "#50db82"],                     accentRGB: [50, 180, 100], mandelSwatch: ["#021308", "#0a4d29", "#22c55e", "#a7f3d0"] },
    { id: "topaz",       label: "Honey",       detail: "Warm amber — like afternoon sunlight through a window.", tone: "light", swatch: ["#fff9e3", "#ffb900"],                     accentRGB: [255, 185, 0], mandelSwatch: ["#140b01", "#663d00", "#ff9f00", "#ffe875"] },
    { id: "goldfish",    label: "Goldfish",    detail: "Saturated goldfish orange with graceful swimming fish and a scale-textured glow.",  tone: "light", swatch: ["#fff3e6", "#ff6a1a"],                     accentRGB: [255, 106, 26], mandelSwatch: ["#140601", "#8c2c04", "#ff6a1a", "#ffc233"] },
    { id: "cobblestone", label: "Cobblestone", detail: "Light grey stone tones — quiet and understated.",        tone: "light", swatch: ["#f3f2f1", "#8a8d91"],                     accentRGB: [138, 141, 145], mandelSwatch: ["#0a0b0d", "#33373d", "#8a8d91", "#e2e6eb"] },
    { id: "bark",        label: "Bark",        detail: "Warm dark wood tones with a rough bark texture.",        tone: "dark",  swatch: ["#241a12", "#d99a54"],                     accentRGB: [217, 154, 84], mandelSwatch: ["#120a05", "#4a2c14", "#c48238", "#fcd385"] },
    { id: "night",       label: "Night",       detail: "Easy on the eyes after dark — full dark mode.",          tone: "dark",  swatch: ["#445c93", "#111827"],                     accentRGB: [105, 168, 255], mandelSwatch: ["#03050d", "#142247", "#3b82f6", "#a5c9ff"] },
    { id: "vaporwave",   label: "Vaporwave",   detail: "Neon magenta and cyan — retro synthwave vibes.",         tone: "dark",  swatch: ["#050505", "#ff00ff", "#00ffff"],          accentRGB: [255, 0, 255], mandelSwatch: ["#07000d", "#590059", "#ff007f", "#00ffff"] },
    { id: "mandelbrot",  label: "Mandelbrot",  detail: "A slowly revolving fractal spiral in violet and molten gold.", tone: "dark",  swatch: ["#05010f", "#6a0dad", "#ff8c00"],  accentRGB: [255, 140, 0], mandelSwatch: ["#05010f", "#5b0e9b", "#ff8c00", "#ffd23f"] },
    { id: "lavalamp",    label: "Lava Lamp",   detail: "Hypnotic molten red wax drifting with glowing neon depth.", tone: "dark",  swatch: ["#0a0103", "#ff1a40", "#ff6b81"],  accentRGB: [255, 42, 77], mandelSwatch: ["#0a0103", "#7a081a", "#ff1a40", "#ff8ca3"] }
  ];

  // Picker samples use the same readable palette as the page, not decorative swatch colors.
  var PREVIEWS = {
    day: ["#f5f5f7", "#ffffff", "#1d1d1f", "#0066cc", "#ffffff"],
    night: ["#1c1c1e", "#2c2c2e", "#f5f5f7", "#69a8ff", "#09111f"],
    sakura: ["#fff0f5", "#ffffff", "#5d1224", "#c93372", "#ffffff"],
    diamond: ["#eafcff", "#ffffff", "#12343b", "#087985", "#ffffff"],
    emerald: ["#f0fff4", "#ffffff", "#1a3a2a", "#237947", "#ffffff"],
    topaz: ["#fff9e3", "#ffffff", "#5c3c00", "#8a5a00", "#ffffff"],
    goldfish: ["#fff3e6", "#ffffff", "#5c2c0a", "#c74300", "#ffffff"],
    cobblestone: ["#f3f2f1", "#ffffff", "#2c2c2c", "#55575b", "#ffffff"],
    bark: ["#241a12", "#3a2a1c", "#f0e0d0", "#d99a54", "#241a12"],
    vaporwave: ["#050505", "#000000", "#ffffff", "#00ffff", "#001b1b"],
    mandelbrot: ["#05010f", "#140a24", "#f5eefc", "#ff8c00", "#1a0a00"],
    lavalamp: ["#0a0103", "#160206", "#fff0f3", "#ff2a4d", "#0d0003"]
  };
  THEMES.forEach(function (theme) {
    theme.preview = PREVIEWS[theme.id];
    theme.family = ["vaporwave", "mandelbrot", "lavalamp"].indexOf(theme.id) >= 0 ? "expressive" : "quiet";
  });

  /* Retired/renamed ids that may still be sitting in a visitor's localStorage
   * or an old bookmark — route them to their replacement instead of falling
   * back to Day. */
  var ALIASES = { morning: "day", dusk: "day", kiwi: "emerald", mango: "topaz", "lava-lamp": "lavalamp", "lava_lamp": "lavalamp" };

  var byId = {};
  var ids = [];
  THEMES.forEach(function (theme) {
    byId[theme.id] = theme;
    ids.push(theme.id);
  });

  function isValid(id) {
    return Object.prototype.hasOwnProperty.call(byId, id);
  }

  function normalize(id) {
    if (Object.prototype.hasOwnProperty.call(ALIASES, id)) return ALIASES[id];
    return isValid(id) ? id : "day";
  }

  function get(id) {
    return byId[normalize(id)] || byId.day;
  }

  function getLabel(id) {
    return get(id).label;
  }

  function getAccentRGB(id) {
    return get(id).accentRGB;
  }

  function getSwatch(id) {
    return get(id).swatch;
  }

  function getMandelSwatch(id) {
    return get(id).mandelSwatch || byId.mandelbrot.mandelSwatch;
  }

  function isDark(id) {
    return get(id).tone === "dark";
  }

  // Shared pages load this registry even when nav-mobile supplies the lighting
  // fallback. Keep presentation behavior in one place for both entry points.
  var PRESENTATION_KEY = "classroomos-presentation";
  function syncPresentation() {
    if (!root.document) return;
    var enabled = false;
    try { enabled = root.localStorage.getItem(PRESENTATION_KEY) === "on"; } catch (_) {}
    var independent = document.documentElement.dataset.themeScope === "independent" ||
      (document.body && document.body.dataset.themeScope === "independent");
    enabled = enabled && !independent;
    document.documentElement.toggleAttribute("data-classroom-presentation", enabled);
    root.dispatchEvent(new CustomEvent("classroomos:presentationchange", { detail: { enabled: enabled } }));
  }
  function setPresentation(enabled) {
    try { root.localStorage.setItem(PRESENTATION_KEY, enabled ? "on" : "off"); } catch (_) {
      // A session-only preference still works when storage is unavailable.
      document.documentElement.toggleAttribute("data-classroom-presentation", !!enabled);
      root.dispatchEvent(new CustomEvent("classroomos:presentationchange", { detail: { enabled: !!enabled } }));
      return;
    }
    syncPresentation();
  }
  function loadSurfaces() {
    if (!root.document || document.documentElement.dataset.themeScope === "independent" ||
        (document.body && document.body.dataset.themeScope === "independent") ||
        document.querySelector('link[data-classroomos-theme-surfaces]')) return;
    var source = document.currentScript;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = source ? new URL("../css/components/theme-surfaces.css", source.src).href : "/assets/css/components/theme-surfaces.css";
    link.dataset.classroomosThemeSurfaces = "true";
    document.head.appendChild(link);
  }

  var api = {
    THEMES: THEMES,
    IDS: ids,
    ALIASES: ALIASES,
    isValid: isValid,
    normalize: normalize,
    get: get,
    getLabel: getLabel,
    getAccentRGB: getAccentRGB,
    getSwatch: getSwatch,
    getMandelSwatch: getMandelSwatch,
    isPresentation: function () { return !!root.document && document.documentElement.hasAttribute("data-classroom-presentation"); },
    setPresentation: setPresentation,
    isDark: isDark
  };

  root.ClassroomOSThemeRegistry = api;
  if (root.document) {
    syncPresentation();
    loadSurfaces();
    root.addEventListener("storage", function (event) {
      if (event.key === PRESENTATION_KEY || event.key === null) syncPresentation();
    });
  }
})(typeof window !== "undefined" ? window : this);
