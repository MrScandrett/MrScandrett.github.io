    // ── Homepage section tabs (Today / Explore / Sandbox) ──────────────
    (function () {
      var tabs = Array.prototype.slice.call(document.querySelectorAll(".home-tab"));
      if (!tabs.length) return;

      function activateTab(tab, updateHash) {
        if (!tab) return;
        tabs.forEach(function (t) {
          t.classList.remove("is-active");
          t.setAttribute("aria-selected", "false");
          t.setAttribute("tabindex", "-1");
        });
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        tab.setAttribute("tabindex", "0");

        document.querySelectorAll(".home-tab-panel").forEach(function (panel) {
          panel.hidden = true;
        });
        var panel = document.getElementById(tab.getAttribute("aria-controls"));
        if (!panel) return;
        panel.hidden = false;

        var tabKey = tab.id.replace("hometab-", "");
        if (updateHash && window.history && window.history.replaceState) {
          window.history.replaceState(null, "", "#" + tabKey);
        }

        document.dispatchEvent(new CustomEvent("home-tabchange", { detail: { panel: panel.id } }));

        // The physics/drawing canvases measure their own width on first
        // paint; if that happened while the Sandbox tab was hidden they'd
        // size to zero, so re-trigger their resize handling now that the
        // panel is visible.
        if (panel.id === "tabpanel-sandbox") {
          window.dispatchEvent(new Event("resize"));
        }
      }

      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          if (tab.classList.contains("is-active")) return;
          activateTab(tab, true);
        });

        tab.addEventListener("keydown", function (event) {
          var currentIndex = tabs.indexOf(tab);
          var nextIndex = currentIndex;

          if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
          else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          else if (event.key === "Home") nextIndex = 0;
          else if (event.key === "End") nextIndex = tabs.length - 1;
          else return;

          event.preventDefault();
          tabs[nextIndex].focus();
          tabs[nextIndex].click();
        });
      });

      function syncFromHash() {
        var hash = (window.location.hash || "").replace("#", "").toLowerCase();
        if (hash) {
          var targetTab = document.getElementById("hometab-" + hash);
          if (targetTab && !targetTab.classList.contains("is-active")) {
            activateTab(targetTab, false);
          }
        }
      }
      syncFromHash();
      window.addEventListener("popstate", syncFromHash);
      window.addEventListener("hashchange", syncFromHash);
    })();

    const homeLaunchSettings = document.getElementById("home-launch-settings");
    if (homeLaunchSettings) {
      homeLaunchSettings.addEventListener("click", function () {
        var toggle = document.querySelector(".nav-settings-toggle");
        if (toggle) toggle.click();
      });
    }

    // Start Class is a native link: navigate immediately, including modified clicks.

    const commandTrigger = document.getElementById('home-command-trigger');
    if (commandTrigger) {
      commandTrigger.addEventListener('click', function () {
        if (window.ClassroomOSCommandPalette && typeof window.ClassroomOSCommandPalette.open === 'function') {
          window.ClassroomOSCommandPalette.open();
        } else {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
        }
      });
    }

