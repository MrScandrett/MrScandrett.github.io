(function () {
  var REFRESH_MS = 15 * 60 * 1000;

  function getPhase(date) {
    var hours = date.getHours();

    if (hours >= 5 && hours < 10) return "morning";
    if (hours >= 10 && hours < 16) return "day";
    if (hours >= 16 && hours < 20) return "dusk";
    return "night";
  }

  function applyPhase(phase) {
    if (!document.body) return phase;

    document.body.dataset.lighting = phase;
    document.documentElement.dataset.lighting = phase;
    return phase;
  }

  function sync() {
    return applyPhase(getPhase(new Date()));
  }

  window.ClassroomOSThemeLighting = {
    getPhase: getPhase,
    sync: sync,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }

  window.setInterval(sync, REFRESH_MS);
}());
