/* Adds "Reset" buttons that restore sim controls (sliders/selects) to their initial values.
   Usage: <script src="…/sim-reset.js" data-groups='[["temp"],["ca","cc"]]'></script>
   Each group gets one button, placed after the parent of its last control. Fires input/change
   events so the sim's own listeners redraw. */
(function () {
  "use strict";
  var script = document.currentScript, groups;
  try { groups = JSON.parse(script.getAttribute("data-groups") || "[]"); } catch (e) { return; }
  window.addEventListener("load", function () {
    groups.forEach(function (ids) {
      var els = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
      if (!els.length) return;
      var initial = els.map(function (el) { return el.value; });
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sim-reset-btn";
      btn.textContent = "Reset";
      btn.style.cssText = "min-height:44px;padding:.4rem .9rem;margin:.5rem 0;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;cursor:pointer;font:inherit";
      btn.setAttribute("aria-label", "Reset " + (els.length > 1 ? "these controls" : "this control") + " to the starting values");
      btn.addEventListener("click", function () {
        els.forEach(function (el, i) {
          el.value = initial[i];
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
      var last = els[els.length - 1];
      var host = last.closest("label") || last;
      host = host.parentElement && host.parentElement.querySelectorAll("input,select").length <= els.length + 1 && host.parentElement !== document.body ? host.parentElement : host;
      host.insertAdjacentElement("afterend", btn);
    });
  });
})();
