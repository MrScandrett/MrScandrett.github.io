/*
 * Rig library dialog for the Pivot stick-figure animator.
 * The engine lives in lib/piv-rigs.js and the rigs in data/pivot-rigs.json; this file is
 * only the browser side: fetch + rasterise artwork, draw preview cards, and a "My rigs" shelf
 * kept in localStorage. Students can save any stage figure as a rig, share it as a .rig.json
 * file, and open one a classmate sent.
 *
 * Host contract (see pivot-animator.js):
 *   PivotRigLibrary.open({
 *     selected() -> { doc, fig } | null     the selected figure, for "Save as rig"
 *     add(built, poseName)                  put a compiled rig on the stage
 *   })
 */
(function () {
  "use strict";
  var Rigs = window.PivRigs, Piv = window.PivEngine;
  if (!Rigs || !Piv) return;

  var script = document.currentScript;
  var siteRoot = new URL("../../../", script ? script.src : location.href);
  var MINE_KEY = "classroomos:pivot-rigs:v1";
  var MAX_MINE = 60;

  var libraryPromise = null;
  var builtCache = {};

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  function loadLibrary() {
    if (!libraryPromise) {
      libraryPromise = fetch(new URL("data/pivot-rigs.json", siteRoot)).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(Rigs.validateLibrary).catch(function (err) { libraryPromise = null; throw err; });
    }
    return libraryPromise;
  }

  // ── My rigs (this browser only) ─────────────────────────────────────────────
  function readMine() {
    try {
      var list = JSON.parse(localStorage.getItem(MINE_KEY) || "[]");
      return Array.isArray(list) ? list.filter(function (spec) { try { return Rigs.validateRig(spec) && spec.category === "mine"; } catch (e) { return false; } }) : [];
    } catch (e) { return []; }
  }
  function writeMine(list) {
    try { localStorage.setItem(MINE_KEY, JSON.stringify(list.slice(0, MAX_MINE))); return true; } catch (e) { return false; }
  }

  // ── I/O for Rigs.build ──────────────────────────────────────────────────────
  var io = {
    fetchText: function (src) {
      return fetch(new URL(src, siteRoot)).then(function (r) {
        if (!r.ok) throw new Error("Could not load " + src);
        return r.text();
      });
    },
    rasterize: function (svg, w, h) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement("canvas");
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          try { resolve(c.toDataURL("image/png")); } catch (e) { reject(e); }
        };
        img.onerror = function () { reject(new Error("An artwork piece would not draw")); };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      });
    }
  };

  function build(spec) {
    var key = spec.id + ":" + (spec.category === "mine" ? JSON.stringify(spec.parts).length : "lib");
    if (!builtCache[key]) builtCache[key] = Rigs.build(spec, io, { density: 2 }).catch(function (err) { delete builtCache[key]; throw err; });
    return builtCache[key];
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
  function previewSvg(built, poseName) {
    var angles = built.poses[poseName] || built.angles;
    var doc = { width: 400, height: 400, fps: 10, types: [built.type], frames: [{ figures: [{ id: 1, type: 0, x: 0, y: 0, scale: 1, angles: angles }], order: [0] }] };
    var ops = Piv.frameOps(doc, 0), minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    function grow(x, y, pad) { minX = Math.min(minX, x - pad); minY = Math.min(minY, y - pad); maxX = Math.max(maxX, x + pad); maxY = Math.max(maxY, y + pad); }
    ops.forEach(function (op) {
      if (op.kind === "line") { grow(op.x1, op.y1, op.width / 2); grow(op.x2, op.y2, op.width / 2); }
      else if (op.kind === "circle") grow(op.cx, op.cy, op.r + op.width / 2);
      else if (op.kind === "image") {
        var cos = Math.cos(op.rotation), sin = Math.sin(op.rotation);
        [[0, 0], [op.width, 0], [0, op.height], [op.width, op.height]].forEach(function (c) {
          var lx = (c[0] - op.pivotX) * op.scaleX, ly = (c[1] - op.pivotY) * op.scaleY;
          grow(op.x + lx * cos - ly * sin, op.y + lx * sin + ly * cos, 0);
        });
      }
    });
    if (!isFinite(minX)) { minX = minY = 0; maxX = maxY = 100; }
    var w = maxX - minX, h = maxY - minY, side = Math.max(w, h) * 1.14, pad = 6;
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return '<svg viewBox="' + [cx - side / 2 - pad, cy - side / 2 - pad, side + pad * 2, side + pad * 2].map(function (n) { return Math.round(n * 10) / 10; }).join(" ") +
      '" role="img" aria-label="' + esc(built.name) + ' preview">' + Piv.frameToSvg(doc, 0) + "</svg>";
  }

  // ── Dialog ──────────────────────────────────────────────────────────────────
  function open(host) {
    var dlg = document.createElement("dialog");
    dlg.className = "piv-cutout-dialog piv-rigs-dialog";
    dlg.setAttribute("aria-labelledby", "piv-rigs-title");
    dlg.innerHTML =
      '<div class="piv-cutout-form">' +
      '<header class="piv-cutout-header"><div class="piv-cutout-header-info"><h2 id="piv-rigs-title">Rig library</h2><span class="piv-cutout-badge" data-count></span></div>' +
      '<button type="button" class="piv-btn piv-btn--close" data-close aria-label="Close rig library" title="Close (Escape)">×</button></header>' +
      '<div class="piv-rigs-bar"><label class="piv-rigs-search"><span>Find</span><input type="search" data-search placeholder="robot, wings, hinge…" autocomplete="off" /></label>' +
      '<div class="piv-rigs-chips" role="group" aria-label="Category" data-chips></div></div>' +
      '<div class="piv-rigs-body" data-body tabindex="-1"><p class="piv-rigs-empty">Loading rigs…</p></div>' +
      '<footer class="piv-rigs-foot"><div class="piv-rigs-save"><label>Save the selected figure as <input type="text" data-save-name maxlength="40" placeholder="My rig name" /></label>' +
      '<button type="button" class="piv-btn" data-save>Save to My rigs</button></div>' +
      '<div class="piv-rigs-save"><button type="button" class="piv-btn" data-import>Open a .rig.json…</button><input type="file" data-import-input accept=".json,application/json" hidden />' +
      '<span class="piv-rigs-note" data-status role="status" aria-live="polite"></span></div></footer></div>';
    document.body.appendChild(dlg);

    var q = function (sel) { return dlg.querySelector(sel); };
    var body = q("[data-body]"), chips = q("[data-chips]"), status = q("[data-status]"), search = q("[data-search]");
    var state = { lib: null, category: "all", query: "", mine: readMine(), poses: {} };
    var opener = document.activeElement;

    function say(text) { status.textContent = text; }

    function allRigs() { return state.lib.rigs.concat(state.mine); }

    function renderChips() {
      var cats = state.lib.categories.concat([{ id: "mine", name: "My rigs", icon: "⭐" }]);
      chips.innerHTML = '<button type="button" class="piv-btn piv-btn--sm" data-cat="all" aria-pressed="' + (state.category === "all") + '">All</button>' +
        cats.map(function (c) {
          var count = c.id === "mine" ? state.mine.length : state.lib.rigs.filter(function (r) { return r.category === c.id; }).length;
          return '<button type="button" class="piv-btn piv-btn--sm" data-cat="' + c.id + '" aria-pressed="' + (state.category === c.id) + '">' + esc((c.icon || "") + " " + c.name) + ' <span class="piv-rigs-n">' + count + "</span></button>";
        }).join("");
    }

    function visible() {
      var lib = { categories: state.lib.categories.concat([{ id: "mine", name: "My rigs", icon: "⭐", blurb: "Saved in this browser. Use Save above, or open a .rig.json from a classmate." }]), rigs: allRigs() };
      return Rigs.byCategory(lib, state.query).filter(function (c) { return state.category === "all" || c.id === state.category; });
    }

    function cardHtml(rig) {
      var poseNames = ["Rest"].concat(Object.keys(rig.poses || {}));
      var credit = rig.credit ? '<p class="piv-rigs-credit">' + esc(rig.credit.text) + "</p>" : "";
      return '<article class="piv-rig-card" data-rig="' + esc(rig.id) + '" data-cat-of="' + esc(rig.category) + '">' +
        '<div class="piv-rig-thumb" data-thumb aria-hidden="true"><span class="piv-rigs-spin">…</span></div>' +
        '<h4>' + esc(rig.name) + ' <span class="piv-rig-bones">' + rig.parts.length + ' bones</span></h4>' +
        '<p>' + esc(rig.blurb || "") + '</p>' + credit +
        '<div class="piv-rig-actions"><label>Pose <select class="piv-select" data-pose aria-label="Pose for ' + esc(rig.name) + '">' +
        poseNames.map(function (n) { return "<option>" + esc(n) + "</option>"; }).join("") + "</select></label>" +
        '<button type="button" class="piv-btn piv-btn--accent" data-add>＋ Add to stage</button>' +
        (rig.category === "mine" ? '<button type="button" class="piv-btn" data-export title="Download this rig to share">Share</button><button type="button" class="piv-btn" data-delete aria-label="Delete ' + esc(rig.name) + '">Delete</button>' : "") +
        "</div></article>";
    }

    function paintThumb(card, rig, poseName) {
      var slot = card.querySelector("[data-thumb]");
      build(rig).then(function (built) { slot.innerHTML = previewSvg(built, poseName || "Rest"); })
        .catch(function () { slot.innerHTML = '<span class="piv-rigs-spin">Preview unavailable</span>'; });
    }

    function render() {
      var groups = visible(), total = 0;
      q("[data-count]").textContent = allRigs().length + " rigs";
      renderChips();
      if (!groups.length) {
        body.innerHTML = '<p class="piv-rigs-empty">' + (state.category === "mine" && !state.query ? "Nothing saved yet. Pose a figure on the stage, then press Save to My rigs." : "No rigs match “" + esc(state.query) + "”.") + "</p>";
        keepFocus();
        return;
      }
      body.innerHTML = groups.map(function (g) {
        total += g.rigs.length;
        return '<section class="piv-rigs-group" aria-labelledby="piv-rigs-g-' + g.id + '"><h3 id="piv-rigs-g-' + g.id + '">' + esc((g.icon || "") + " " + g.name) + ' <small>' + esc(g.blurb || "") + '</small></h3><div class="piv-rigs-grid">' + g.rigs.map(cardHtml).join("") + "</div></section>";
      }).join("");
      Array.prototype.forEach.call(body.querySelectorAll(".piv-rig-card"), function (card) {
        paintThumb(card, allRigs().find(function (r) { return r.id === card.dataset.rig; }));
      });
      keepFocus();
    }

    // A re-render can delete the button that had focus; keep the keyboard inside the dialog.
    function keepFocus() { if (!dlg.contains(document.activeElement)) body.focus(); }

    function rigOf(card) { return allRigs().find(function (r) { return r.id === card.dataset.rig; }); }

    body.addEventListener("change", function (e) {
      var sel = e.target.closest("[data-pose]");
      if (!sel) return;
      var card = sel.closest(".piv-rig-card");
      paintThumb(card, rigOf(card), sel.value);
    });

    body.addEventListener("click", function (e) {
      var card = e.target.closest(".piv-rig-card");
      if (!card) return;
      var rig = rigOf(card);
      if (e.target.closest("[data-add]")) {
        var pose = card.querySelector("[data-pose]").value, btn = e.target.closest("[data-add]");
        btn.disabled = true;
        build(rig).then(function (built) {
          host.add(built, pose);
          say("Added " + rig.name + (pose === "Rest" ? "" : " (" + pose + ")") + " to the stage. Add it again for a second one.");
        }).catch(function (err) { say("Could not add " + rig.name + ": " + err.message); })
          .then(function () { btn.disabled = false; btn.focus(); });
      } else if (e.target.closest("[data-delete]")) {
        state.mine = state.mine.filter(function (r) { return r.id !== rig.id; });
        writeMine(state.mine);
        say("Deleted " + rig.name + ".");
        render();
      } else if (e.target.closest("[data-export]")) {
        download(rig);
        say("Saved " + rig.id + ".rig.json. Send it to a classmate and they can open it here.");
      }
    });

    function download(rig) {
      var a = document.createElement("a"), url = URL.createObjectURL(new Blob([JSON.stringify(rig, null, 1)], { type: "application/json" }));
      a.href = url; a.download = rig.id + ".rig.json"; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }

    function addMine(spec) {
      var base = spec.id, n = 2;
      while (state.mine.some(function (r) { return r.id === spec.id; })) spec.id = base + "-" + n++;
      state.mine.unshift(spec);
      if (!writeMine(state.mine)) { say("This browser would not keep the rig. Use Share to download it instead."); }
      state.category = "mine"; state.query = ""; search.value = "";
      render();
    }

    q("[data-save]").addEventListener("click", function () {
      var picked = host.selected && host.selected();
      if (!picked) return say("Select a figure on the stage first.");
      var name = q("[data-save-name]").value.trim() || "My rig";
      try {
        addMine(Rigs.rigFromFigure(picked.doc, picked.fig, name, Piv.figureJoints));
        say("Saved “" + name + "” with its current pose as the starting pose.");
      } catch (err) { say(err.message); }
    });

    q("[data-import]").addEventListener("click", function () { q("[data-import-input]").click(); });
    q("[data-import-input]").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      if (file.size > 400000) return say("That file is too big to be a rig.");
      file.text().then(function (text) {
        var spec = JSON.parse(text);
        if (spec && spec.svg) throw new Error("Rigs that use site artwork come from the library, not from files.");
        if (spec && spec.parts && spec.parts.some(function (p) { return p.els; })) throw new Error("Artwork parts are not allowed in shared files.");
        spec.category = "mine";
        Rigs.validateRig(spec);
        addMine(spec);
        say("Opened “" + spec.name + "”.");
      }).catch(function (err) { say("That file is not a rig: " + err.message); });
    });

    chips.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]");
      if (!b) return;
      state.category = b.dataset.cat;
      render();
    });
    search.addEventListener("input", function () { state.query = search.value; render(); });
    q("[data-close]").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); dlg.close(); } });
    dlg.addEventListener("close", function () {
      dlg.remove();
      if (opener && opener.focus) opener.focus();
    });

    dlg.showModal();
    search.focus();
    loadLibrary().then(function (lib) { state.lib = lib; render(); })
      .catch(function (err) { body.innerHTML = '<p class="piv-rigs-empty">The rig library could not load (' + esc(err.message) + "). Check your connection and try again.</p>"; });
  }

  window.PivotRigLibrary = { open: open, load: loadLibrary, build: build };
})();
