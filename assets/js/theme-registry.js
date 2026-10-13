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
    { id: "diamond",     label: "Diamond",     detail: "Icy teal blue — crisp, cool, and focused.",              tone: "light", swatch: ["#091224", "#00c6ff"],                     accentRGB: [80, 190, 255], mandelSwatch: ["#020d18", "#004c66", "#00c6ff", "#d0f8ff"] },
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
    isDark: isDark
  };

  root.ClassroomOSThemeRegistry = api;
})(typeof window !== "undefined" ? window : this);
