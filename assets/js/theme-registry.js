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
    { id: "day",         label: "Day",         detail: "Clean and bright — the default ClassroomOS look.",      tone: "light", swatch: ["#dff1ff", "#6eb6ff"],                     accentRGB: [0, 113, 227] },
    { id: "sakura",      label: "Sakura",      detail: "Cherry blossom pink with a soft spring glow.",           tone: "light", swatch: ["#fff7fb", "#ff85b2"],                     accentRGB: [220, 80, 150] },
    { id: "diamond",     label: "Diamond",     detail: "Icy teal blue — crisp, cool, and focused.",              tone: "light", swatch: ["#091224", "#00c6ff"],                     accentRGB: [80, 190, 255] },
    { id: "emerald",     label: "Emerald",     detail: "Fresh leaf green — calm and easy on the eyes.",          tone: "light", swatch: ["#f4fff7", "#50db82"],                     accentRGB: [50, 180, 100] },
    { id: "topaz",       label: "Honey",       detail: "Warm amber — like afternoon sunlight through a window.", tone: "light", swatch: ["#fff9e3", "#ffb900"],                     accentRGB: [255, 185, 0] },
    { id: "goldfish",    label: "Goldfish",    detail: "Saturated goldfish orange with a scale-textured glow.",  tone: "light", swatch: ["#fff3e6", "#ff6a1a"],                     accentRGB: [255, 106, 26] },
    { id: "cobblestone", label: "Cobblestone", detail: "Light grey stone tones — quiet and understated.",        tone: "light", swatch: ["#f3f2f1", "#8a8d91"],                     accentRGB: [138, 141, 145] },
    { id: "bark",        label: "Bark",        detail: "Warm dark wood tones with a rough bark texture.",        tone: "dark",  swatch: ["#241a12", "#d99a54"],                     accentRGB: [217, 154, 84] },
    { id: "night",       label: "Night",       detail: "Easy on the eyes after dark — full dark mode.",          tone: "dark",  swatch: ["#445c93", "#111827"],                     accentRGB: [105, 168, 255] },
    { id: "vaporwave",   label: "Vaporwave",   detail: "Neon magenta and cyan — retro synthwave vibes.",         tone: "dark",  swatch: ["#050505", "#ff00ff", "#00ffff"],          accentRGB: [255, 0, 255] }
  ];

  /* Retired/renamed ids that may still be sitting in a visitor's localStorage
   * or an old bookmark — route them to their replacement instead of falling
   * back to Day. */
  var ALIASES = { morning: "day", dusk: "day", kiwi: "emerald", mango: "topaz" };

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
    isDark: isDark
  };

  root.ClassroomOSThemeRegistry = api;
})(typeof window !== "undefined" ? window : this);
