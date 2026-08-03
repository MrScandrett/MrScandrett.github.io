(function () {
  "use strict";

  function initVolumeTabs() {
    var tablist = document.querySelector(".compendium-volume-tabs");
    if (!tablist) return;

    var tabs = Array.prototype.slice.call(tablist.querySelectorAll("[data-volume-filter]"));
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
        if (tab.dataset.volumeFilter !== "all") {
          setVolumeCollapsed(tab.dataset.volumeFilter, false);
        }
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
