(function () {
  "use strict";

  function initVolumeTabs() {
    var tablist = document.querySelector(".compendium-volume-tabs");
    if (!tablist) return;

    var tabs = Array.prototype.slice.call(tablist.querySelectorAll("[data-volume-filter]"));
    var volumeItems = Array.prototype.slice.call(document.querySelectorAll("[data-compendium-volume]"));
    var searchInput = document.getElementById("lesson-search");

    function selectVolume(volume, options) {
      var selected = String(volume || "all");
      if (selected !== "all" && !tabs.some(function (tab) {
        return tab.dataset.volumeFilter === selected;
      })) return;

      tabs.forEach(function (tab) {
        var active = tab.dataset.volumeFilter === selected;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
        tab.tabIndex = active ? 0 : -1;
      });

      volumeItems.forEach(function (item) {
        item.hidden = selected !== "all" && item.dataset.compendiumVolume !== selected;
      });

      if (selected === "all") tablist.scrollLeft = 0;

      if (options && options.focus) {
        var activeTab = tabs.find(function (tab) {
          return tab.dataset.volumeFilter === selected;
        });
        if (activeTab) activeTab.focus();
      }
    }

    window.setCompendiumVolume = selectVolume;

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        selectVolume(tab.dataset.volumeFilter);
      });

      tab.addEventListener("keydown", function (event) {
        var nextIndex = null;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        selectVolume(tabs[nextIndex].dataset.volumeFilter, { focus: true });
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        if (searchInput.value.trim()) selectVolume("all");
      });
    }

    selectVolume("all");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVolumeTabs);
  } else {
    initVolumeTabs();
  }
})();
