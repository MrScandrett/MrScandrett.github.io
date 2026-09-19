(function () {
  "use strict";

  var script = document.currentScript;
  var main = document.querySelector("main");
  if (!script || !main) return;
  var dataUrl = new URL("../../data/math-pathway.json", script.src).href;
  var lessonFile = location.pathname.split("/").pop() || "index.html";

  var css = document.createElement("style");
  css.textContent =
    ".math-pathway{max-width:1000px;margin:3rem auto 1.5rem;padding:1.1rem 1.25rem;border:1px solid var(--border-subtle,#ccc);border-radius:14px;background:var(--glass-fill-strong,transparent)}" +
    ".math-pathway-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.5rem;align-items:baseline;font-size:.8rem;color:var(--text-muted,#666)}" +
    ".math-pathway-head a{color:var(--accent,#3157a4);font-weight:700}" +
    ".math-pathway-bar{display:flex;gap:3px;margin:.7rem 0 .9rem}" +
    ".math-pathway-bar i{flex:1;height:5px;border-radius:3px;background:var(--border-subtle,#ccc)}" +
    ".math-pathway-bar i.done{background:var(--accent,#3157a4);opacity:.55}" +
    ".math-pathway-bar i.here{background:var(--accent,#3157a4)}" +
    ".math-pathway-links{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}" +
    ".math-pathway-links a{display:block;padding:.75rem .9rem;border:1px solid var(--border-subtle,#ccc);border-radius:10px;text-decoration:none;color:var(--text-main,inherit)}" +
    ".math-pathway-links a:hover,.math-pathway-links a:focus-visible{border-color:var(--accent,#3157a4)}" +
    ".math-pathway-links small{display:block;font-size:.72rem;color:var(--text-muted,#666);text-transform:uppercase;letter-spacing:.05em}" +
    ".math-pathway-links strong{font-size:.95rem}" +
    ".math-pathway-links .next{text-align:right;grid-column:2}" +
    "@media(max-width:560px){.math-pathway-links{grid-template-columns:1fr}.math-pathway-links .next{grid-column:1}}";
  document.head.appendChild(css);

  fetch(dataUrl).then(function (r) { return r.json(); }).then(function (data) {
    var steps = data.steps;
    var nav = document.createElement("nav");
    nav.className = "math-pathway";
    nav.setAttribute("aria-label", "Mathematics pathway");
    main.appendChild(nav);

    function currentIndex() {
      var byHash = steps.findIndex(function (s) { return s.page === lessonFile + location.hash; });
      if (byHash >= 0) return byHash;
      return steps.findIndex(function (s) { return s.page.split("#")[0] === lessonFile; });
    }

    function link(step, cls, label) {
      if (!step) return "";
      return '<a class="' + cls + '" href="' + step.page + '"><small>' + label + "</small><strong>" + step.title + "</strong></a>";
    }

    function render() {
      var i = currentIndex();
      if (i < 0) { nav.hidden = true; return; }
      nav.hidden = false;
      var level = data.levels.filter(function (l) { return l.id === steps[i].level; })[0];
      var bar = steps.map(function (_, n) { return '<i class="' + (n < i ? "done" : n === i ? "here" : "") + '"></i>'; }).join("");
      nav.innerHTML =
        '<div class="math-pathway-head"><span>Math pathway · Level ' + level.id + " " + level.name + " (" + level.grades +
        ") · Step " + (i + 1) + " of " + steps.length + '</span><a href="../../steam-lessons.html#module-math">All math lessons</a></div>' +
        '<div class="math-pathway-bar" aria-hidden="true">' + bar + "</div>" +
        '<div class="math-pathway-links">' + link(steps[i - 1], "prev", "← Previous") + link(steps[i + 1], "next", "Next →") + "</div>";
    }

    render();
    window.addEventListener("hashchange", render);
  }).catch(function () { /* pathway nav is an enhancement */ });
})();
