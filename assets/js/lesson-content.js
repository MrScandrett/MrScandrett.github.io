/**
 * lesson-content.js — Lesson content components
 * ClassroomOS · Mr. Scandrett's STEAM Lessons
 *
 * Wires: accordion groups (.ll-accordion-group), the sticky
 * scroll-spy steps rail (.ll-lesson-steps), and a toast helper.
 * Deliberately independent of lesson-layout.js's tab/panel logic —
 * safe to include on any lesson page whether or not it also loads
 * lesson-layout.js.
 *
 * Include anywhere in <body>:
 *   <script src="../assets/js/lesson-content.js"></script>
 */
(function (global) {
  "use strict";

  function initAccordionGroups() {
    document.querySelectorAll(".ll-accordion-group").forEach(function (group) {
      var items = Array.prototype.slice.call(group.querySelectorAll(".ll-accordion"));
      items.forEach(function (item) {
        item.addEventListener("toggle", function () {
          if (!item.open) return;
          items.forEach(function (other) {
            if (other !== item) other.open = false;
          });
        });
      });
    });
  }

  function findScrollParent(el) {
    var node = el.parentElement;
    while (node && node !== document.body) {
      var style = getComputedStyle(node);
      if ((style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return null; // falls back to the viewport
  }

  function initLessonSteps() {
    document.querySelectorAll(".ll-lesson-steps").forEach(function (rail) {
      var links = Array.prototype.slice.call(rail.querySelectorAll("a[href^='#']"));
      if (!links.length) return;

      var targets = [];
      links.forEach(function (link) {
        var id = link.getAttribute("href").slice(1);
        var target = document.getElementById(id);
        if (target) targets.push({ link: link, target: target });
      });
      if (!targets.length) return;

      var root = findScrollParent(rail);

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var match = targets.find(function (t) { return t.target === entry.target; });
            if (!match) return;
            if (entry.isIntersecting) {
              links.forEach(function (l) { l.classList.remove("ll-step-active"); });
              match.link.classList.add("ll-step-active");
            }
          });
        },
        { root: root, rootMargin: "-45% 0px -50% 0px", threshold: 0 }
      );

      targets.forEach(function (t) { observer.observe(t.target); });
    });
  }

  var toastRegion = null;
  function toast(message, duration) {
    if (!toastRegion) {
      toastRegion = document.createElement("div");
      toastRegion.className = "ll-toast-region";
      toastRegion.setAttribute("role", "status");
      toastRegion.setAttribute("aria-live", "polite");
      document.body.appendChild(toastRegion);
    }
    var el = document.createElement("div");
    el.className = "ll-toast";
    el.textContent = message;
    toastRegion.appendChild(el);

    requestAnimationFrame(function () {
      el.classList.add("ll-toast-visible");
    });

    var hideAfter = typeof duration === "number" ? duration : 2200;
    setTimeout(function () {
      el.classList.remove("ll-toast-visible");
      el.addEventListener("transitionend", function () { el.remove(); }, { once: true });
      setTimeout(function () { if (el.parentNode) el.remove(); }, 400);
    }, hideAfter);
  }

  function init() {
    initAccordionGroups();
    initLessonSteps();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.LessonContent = { toast: toast };
})(window);
