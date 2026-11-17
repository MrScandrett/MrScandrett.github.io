(function () {
  "use strict";

  function initVolumeFilter() {
    var filter = document.getElementById("compendium-volume-filter");
    if (!filter) return;
    var volumeItems = Array.prototype.slice.call(document.querySelectorAll("[data-compendium-volume]"));
    var volumeToggles = Array.prototype.slice.call(document.querySelectorAll("[data-volume-toggle]"));
    var searchInput = document.getElementById("lesson-search");
    var collapsedVolumes = {};
    var collapseStorageKey = "sl-collapsed-volumes";

    try {
      collapsedVolumes = JSON.parse(localStorage.getItem(collapseStorageKey) || "{}");
    } catch (error) {
      collapsedVolumes = {};
    }

    function setVolumeCollapsed(volume, collapsed, persist) {
      var selected = String(volume);
      var toggle = volumeToggles.find(function (item) {
        return item.dataset.volumeToggle === selected;
      });

      volumeItems.forEach(function (item) {
        if (!item.classList.contains("module-section")) return;
        if (item.dataset.compendiumVolume !== selected) return;
        item.classList.toggle("volume-collapsed", collapsed);
        // A module hidden when reveal.js first observes it can otherwise keep
        // its opacity: 0 reveal state after its volume is opened on mobile.
        if (!collapsed) item.classList.add("is-visible");
      });

      if (toggle) {
        toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
        var label = toggle.querySelector(".compendium-volume-toggle-label");
        if (label) label.textContent = collapsed ? "Expand volume" : "Collapse volume";
      }

      collapsedVolumes[selected] = collapsed;
      if (persist !== false) {
        try {
          localStorage.setItem(collapseStorageKey, JSON.stringify(collapsedVolumes));
        } catch (error) {}
      }
    }

    volumeToggles.forEach(function (toggle) {
      var volume = toggle.dataset.volumeToggle;
      setVolumeCollapsed(volume, collapsedVolumes[volume] === true, false);
      toggle.addEventListener("click", function () {
        setVolumeCollapsed(volume, toggle.getAttribute("aria-expanded") === "true");
      });

      var divider = toggle.closest(".compendium-volume-divider");
      if (divider) {
        divider.querySelectorAll("nav a[href^='#module-']").forEach(function (link) {
          link.addEventListener("click", function () {
            setVolumeCollapsed(volume, false);
          });
        });
      }
    });

    function selectVolume(volume, options) {
      var selected = String(volume || "all");
      if (!Array.prototype.some.call(filter.options, function (option) { return option.value === selected; })) return;
      filter.value = selected;

      volumeItems.forEach(function (item) {
        item.hidden = selected !== "all" && item.dataset.compendiumVolume !== selected;
        if (!item.hidden && item.classList.contains("module-section")) {
          item.classList.add("is-visible");
        }
      });

      window.dispatchEvent(new CustomEvent("compendiumvolumechange", {
        detail: {
          volume: selected,
          userInitiated: Boolean(options && options.userInitiated)
        }
      }));
    }

    window.setCompendiumVolume = selectVolume;

    filter.addEventListener("change", function () {
      if (filter.value !== "all") setVolumeCollapsed(filter.value, false);
      selectVolume(filter.value, { userInitiated: true });
    });

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        if (searchInput.value.trim()) selectVolume("all");
      });
    }

    selectVolume("all");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVolumeFilter);
  } else {
    initVolumeFilter();
  }
})();
