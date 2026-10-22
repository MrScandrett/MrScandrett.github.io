(function () {
  "use strict";
  var ORDER = [
    ["feynman-atoms", "Atoms: Structure, Motion, and Matter"],
    ["periodic-table", "Periodic Table of Elements"],
    ["molecular-bonding-lab", "Molecular Bonding & Compounds Lab"],
    ["water-molecule", "Water: The Architecture of H₂O"],
    ["states-of-matter", "States of Matter"],
    ["stoichiometry", "Stoichiometry"],
    ["catalyst", "Catalysts & Activation Energy"],
    ["titration", "Titration"],
    ["electrochemistry", "Electrochemistry"],
    ["radioactive-decay", "Radioactive Decay"],
    ["plastics", "Plastics: Polymer Chemistry"],
    ["steam-machines-chemistry", "Chemistry of Steam Machines"]
  ];
  var main = document.querySelector("main");
  if (!main) return;
  var slug = location.pathname.split("/").pop().replace(/\.html$/, "");
  var i = ORDER.findIndex(function (p) { return p[0] === slug; });
  if (i < 0) return;
  var style = document.createElement("style");
  style.textContent = ".chem-nav{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:space-between;align-items:center;max-width:1040px;margin:2.5rem auto 1rem;padding:1rem;border-top:1px solid var(--line,#cbd5e1)}" +
    ".chem-nav a{min-height:44px;display:inline-flex;align-items:center;padding:.5rem .9rem;border:1px solid var(--line,#cbd5e1);border-radius:10px;color:var(--text,inherit);text-decoration:none;font-weight:600}" +
    ".chem-nav a:hover,.chem-nav a:focus-visible{border-color:var(--accent,#2563eb);outline:2px solid var(--accent,#2563eb);outline-offset:2px}";
  document.head.appendChild(style);
  var nav = document.createElement("nav");
  nav.className = "chem-nav";
  nav.setAttribute("aria-label", "Chemistry lessons");
  function link(href, text, rel) {
    var a = document.createElement("a");
    a.href = href; a.textContent = text;
    if (rel) a.rel = rel;
    return a;
  }
  nav.appendChild(i > 0 ? link(ORDER[i - 1][0] + ".html", "← " + ORDER[i - 1][1], "prev") : document.createElement("span"));
  nav.appendChild(link("index.html", "All chemistry lessons"));
  nav.appendChild(i < ORDER.length - 1 ? link(ORDER[i + 1][0] + ".html", ORDER[i + 1][1] + " →", "next") : document.createElement("span"));
  main.appendChild(nav);
})();
