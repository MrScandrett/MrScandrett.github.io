(function () {
  var REFRESH_MS = 15 * 60 * 1000;
  var STORAGE_MODE = "classroomos-lighting-mode";
  var STORAGE_PHASE = "classroomos-lighting-phase";
  var VALID_PHASES = ["day", "night"];
  var currentPhase = null;
  var CHANGE_EVENT = "classroomos:lightingchange";

  function getPhase(date) {
    var hours = date.getHours();
    return (hours >= 6 && hours < 19) ? "day" : "night";
  }

  function isValidPhase(phase) {
    return VALID_PHASES.indexOf(phase) !== -1;
  }

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      /* ignore */
    }
  }

  function getMode() {
    return readStorage(STORAGE_MODE) === "manual" ? "manual" : "auto";
  }

  function getStoredPhase() {
    var stored = readStorage(STORAGE_PHASE);
    if (stored === "morning" || stored === "dusk") return "day";
    return isValidPhase(stored) ? stored : "day";
  }

  function resolvePhase() {
    return getMode() === "manual" ? getStoredPhase() : getPhase(new Date());
  }

  function applyPhase(phase) {
    if (!document.body) return phase;

    document.body.dataset.lighting = phase;
    document.body.dataset.lightingMode = getMode();
    document.documentElement.dataset.lighting = phase;
    document.documentElement.dataset.lightingMode = getMode();
    currentPhase = phase;
    emitChange(phase);
    return phase;
  }

  function emitChange(phase) {
    var detail = { phase: phase, mode: getMode() };
    var event;

    if (typeof window.CustomEvent === "function") {
      event = new CustomEvent(CHANGE_EVENT, { detail: detail });
    } else {
      event = document.createEvent("CustomEvent");
      event.initCustomEvent(CHANGE_EVENT, false, false, detail);
    }

    window.dispatchEvent(event);
  }

  function sync() {
    return applyPhase(resolvePhase());
  }

  function setMode(mode) {
    writeStorage(STORAGE_MODE, mode === "manual" ? "manual" : "auto");
    return sync();
  }

  function setPhase(phase) {
    if (!isValidPhase(phase)) phase = "day";
    writeStorage(STORAGE_PHASE, phase);
    writeStorage(STORAGE_MODE, "manual");
    return sync();
  }

  window.ClassroomOSThemeLighting = {
    getPhase: getPhase,
    getMode: getMode,
    getStoredPhase: getStoredPhase,
    getCurrentPhase: function () {
      return currentPhase || document.body && document.body.dataset.lighting || resolvePhase();
    },
    setMode: setMode,
    setPhase: setPhase,
    sync: sync,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }

  window.addEventListener("storage", function (event) {
    if (!event || event.key === STORAGE_MODE || event.key === STORAGE_PHASE || event.key === null) {
      sync();
    }
  });

  window.setInterval(sync, REFRESH_MS);
}());
