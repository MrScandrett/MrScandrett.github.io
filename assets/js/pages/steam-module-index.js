(function () {
  "use strict";

  // One standard way to read every subject shelf. "Guide" (the default, stored as
  // "index") lays each chapter out as compact rows: the lesson's title, what kind of
  // lesson it is, its grades, the topics inside, and a two-line summary. "Cards" keeps
  // the photo tiles, wrapped into rows instead of a sideways-scrolling lane.
  // Every shelf also gets a chapter bar (jump to a chapter) and a "find in this
  // subject" box, so a 50-lesson shelf never has to be read top to bottom.
  // Runs after the inline script that groups tiles into .lesson-pathway.

  var STORAGE_KEY = "steam-lessons-view";
  var actions = document.getElementById("catalog-browser-actions");
  if (!actions || !document.querySelector(".lesson-pathway")) return;

  function readView() {
    try { return localStorage.getItem(STORAGE_KEY) === "cards" ? "cards" : "index"; }
    catch (error) { return "index"; }
  }

  function saveView(view) {
    try { localStorage.setItem(STORAGE_KEY, view); } catch (error) { /* private window */ }
  }

  // ── Lesson rows ───────────────────────────────────────────────────────────

  // The first part of a kicker is often a label ("Skill", "Lab", "Step 3") rather
  // than a topic. Those become the type badge; the rest are the topics inside.
  var GENERIC = /^(skill|foundations?|interactive (lab|lesson|studio)|workshop|pathway( hub)?|lab|capstone( bridge)?|bridge|studio( lab)?|new|live|build a classic|project|prerequisite|guide|curriculum|future slot|play|benchmark|real robot|biography|pioneer|learning pathway|design foundations|(step|phase|godot) \d+|grades? .*|all ages)$/i;

  var TYPES = [
    // [badge, test(meta, kicker, href)]
    ["Person", function (m, k, h) { return /\/pioneers\//.test(h) || /biograph|author study/.test(m.type) || /^(biography|pioneer)\b/i.test(k); }],
    ["Pathway", function (m, k) { return /pathway|hub|roadmap/.test(m.type) || /^pathway/i.test(k); }],
    ["Play", function (m, k) { return /^play\b/i.test(k); }],
    ["Build", function (m, k) { return /project|studio|workshop/.test(m.type) || /^(capstone|project|build a classic|studio|workshop)\b/i.test(k); }],
    ["Read", function (m) { return /article|reading|reference|guide$/.test(m.type); }],
    ["Lab", function (m, k) { return /lab|investigation|exploration|interactive$/.test(m.type) || /\blab\b/i.test(k); }],
    ["Lesson", function () { return true; }]
  ];

  function kickerParts(tile) {
    var node = tile.querySelector(".tile-kicker");
    return node ? node.textContent.split("·").map(function (part) { return part.trim(); }).filter(Boolean) : [];
  }

  function topicsFor(parts, meta) {
    var topics = parts.filter(function (part, index) {
      return !(index === 0 && GENERIC.test(part)) && !/^grades?\b/i.test(part) && !/^new$/i.test(part);
    });
    if (!topics.length && meta.keywords) topics = meta.keywords.slice(0, 4);
    return topics.slice(0, 4);
  }

  function gradeLabel(band) {
    if (!band) return "";
    return "Gr " + band.replace(/-/g, "–").replace(/^PreK–College$/, "All");
  }

  // ── Icons ─────────────────────────────────────────────────────────────────
  // Every lesson has an emoji in data/lessons.json ("icon"); chapters and the few
  // tiles that aren't catalog lessons carry data-icon in steam-lessons.html.
  // Under the Blocky skin each icon is redrawn as a 16×16 pixel item (the emoji
  // rendered small, alpha snapped hard) sitting in an inventory slot.
  var pixelCache = {};

  function blockySkin() {
    return document.documentElement.getAttribute("data-skin") === "blocky";
  }

  function pixelArt(emoji) {
    if (pixelCache[emoji] !== undefined) return pixelCache[emoji];
    var size = 16;
    var url = "";
    try {
      var canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      var ctx = canvas.getContext("2d");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = (size - 1) + 'px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      ctx.fillText(emoji, size / 2, size / 2 + 1);
      var image = ctx.getImageData(0, 0, size, size);
      var data = image.data;
      var solid = 0;
      for (var i = 3; i < data.length; i += 4) {
        if (data[i] > 96) { data[i] = 255; solid += 1; } else data[i] = 0;
      }
      ctx.putImageData(image, 0, 0);
      if (solid > 6) url = canvas.toDataURL();
    } catch (error) { /* no canvas: keep the emoji */ }
    pixelCache[emoji] = url;
    return url;
  }

  function pixelate(el) {
    var emoji = el.dataset.icon;
    var url = emoji && blockySkin() ? pixelArt(emoji) : "";
    el.classList.toggle("has-pixel", Boolean(url));
    if (url) el.style.setProperty("--pixel-icon", 'url("' + url + '")');
    else el.style.removeProperty("--pixel-icon");
  }

  function setIcon(el, emoji) {
    if (!emoji || el.dataset.icon === emoji) return;
    el.dataset.icon = emoji;
    el.textContent = emoji;
    pixelate(el);
  }

  new MutationObserver(function () {
    document.querySelectorAll(".tile-icon[data-icon], .chapter-icon[data-icon], .shelf-chapter-icon[data-icon]").forEach(pixelate);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-skin"] });

  document.querySelectorAll(".module-section .module-cluster-label[data-icon]").forEach(function (label) {
    var icon = document.createElement("span");
    icon.className = "chapter-icon";
    icon.setAttribute("aria-hidden", "true");
    label.insertBefore(icon, label.firstChild);
    setIcon(icon, label.dataset.icon);
  });

  function decorate(tile, meta) {
    meta = meta || {};
    var slot = tile.querySelector(".tile-icon");
    if (!slot) {
      slot = document.createElement("span");
      slot.className = "tile-icon";
      slot.setAttribute("aria-hidden", "true");
      tile.insertBefore(slot, tile.firstChild);
    }
    setIcon(slot, tile.dataset.icon || meta.icon || (tile.classList.contains("tile-coming-soon") ? "🚧" : ""));
    var href = tile.getAttribute("href") || "";
    var parts = kickerParts(tile);
    var kicker = parts.join(" · ");
    var type = "Lesson";
    for (var i = 0; i < TYPES.length; i++) {
      if (TYPES[i][1]({ type: (meta.lessonType || "").toLowerCase() }, kicker, href)) { type = TYPES[i][0]; break; }
    }
    var badges = tile.querySelector(".tile-badges");
    if (!badges) {
      badges = document.createElement("span");
      badges.className = "tile-badges";
      var strong = tile.querySelector("strong");
      if (strong) strong.insertAdjacentElement("afterend", badges);
      else tile.appendChild(badges);
    }
    var grade = gradeLabel(meta.gradeBand || tile.dataset.catalogGrade);
    badges.innerHTML = '<span class="tile-type" data-type="' + type.toLowerCase() + '">' + type + "</span>" +
      (grade ? '<span class="tile-grade">' + grade + "</span>" : "");
    var topics = topicsFor(parts, meta);
    var inside = tile.querySelector(".tile-topics");
    if (topics.length) {
      if (!inside) {
        inside = document.createElement("span");
        inside.className = "tile-topics";
        badges.insertAdjacentElement("afterend", inside);
      }
      inside.textContent = topics.join(" · ");
    }
    tile.dataset.lessonKind = type.toLowerCase();
  }

  var tiles = Array.prototype.slice.call(document.querySelectorAll(".module-section .tile"));
  tiles.forEach(function (tile) { decorate(tile, null); });

  // Grade bands and lesson types come from data/lessons.json, which the page's
  // search script fetches once (on DOMContentLoaded, after this file has run);
  // reuse that promise rather than a second request.
  new Promise(function (resolve) {
    if (document.readyState !== "loading") resolve(window.lessonCatalogReady);
    else window.addEventListener("DOMContentLoaded", function () { resolve(window.lessonCatalogReady); });
  }).then(function (lessons) {
    if (!lessons || !lessons.length) return;
    var byUrl = {};
    lessons.forEach(function (lesson) { byUrl[lesson.url] = lesson; });
    tiles.forEach(function (tile) {
      var href = (tile.getAttribute("href") || "").split("#")[0];
      if (byUrl[href]) decorate(tile, byUrl[href]);
    });
    document.querySelectorAll(".lesson-pathway").forEach(updateChapterMeta);
  });

  // ── Chapters ──────────────────────────────────────────────────────────────

  function shortChapter(text) {
    return text
      .replace(/^(level|chapter|stage|phase)\s+[\d.]+\s*·\s*/i, "")
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim();
  }

  function chapterNumber(text, index) {
    var match = text.match(/^(?:level|chapter|stage|phase)\s+([\d.]+)/i);
    return match ? match[1] : String(index + 1);
  }

  function visibleTiles(scope) {
    return Array.prototype.filter.call(scope.querySelectorAll(".tile"), function (tile) {
      return !tile.classList.contains("grade-hidden") && !tile.classList.contains("lesson-hidden") &&
        !tile.classList.contains("shelf-miss");
    });
  }

  function updateChapterMeta(pathway) {
    var label = pathway.querySelector(".module-cluster-label");
    if (!label) return;
    var meta = label.querySelector(".chapter-meta");
    if (!meta) {
      meta = document.createElement("span");
      meta.className = "chapter-meta";
      label.appendChild(meta);
    }
    var count = visibleTiles(pathway).length;
    var groups = Array.prototype.map.call(pathway.querySelectorAll(".module-era-label:not(.shelf-miss):not(.era-empty)"), function (era) {
      return era.firstChild ? era.firstChild.textContent.trim() : "";
    }).filter(Boolean);
    meta.textContent = count + (count === 1 ? " lesson" : " lessons") +
      (groups.length > 1 ? " · " + groups.length + " groups" : "");
  }

  document.querySelectorAll(".module-section").forEach(function (section) {
    var grid = section.querySelector(".module-tile-grid");
    var pathways = Array.prototype.slice.call(section.querySelectorAll(".lesson-pathway"));
    if (!grid || pathways.length < 2) return;

    var bar = document.createElement("nav");
    bar.className = "shelf-nav";
    bar.setAttribute("aria-label", "Chapters in this subject");

    var find = document.createElement("label");
    find.className = "shelf-find";
    find.innerHTML = '<span class="shelf-find-label">Find in this subject</span>' +
      '<input type="search" autocomplete="off" spellcheck="false" placeholder="Find in this subject…">' +
      '<span class="shelf-find-status" role="status" aria-live="polite"></span>';
    var input = find.querySelector("input");
    var status = find.querySelector(".shelf-find-status");

    var chips = document.createElement("ol");
    chips.className = "shelf-chapters";
    pathways.forEach(function (pathway, index) {
      var title = pathway.querySelector(".module-cluster-label strong");
      if (!title) return;
      if (!pathway.id) pathway.id = section.id + "-chapter-" + (index + 1);
      var text = title.textContent.trim();
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.href = "#" + pathway.id;
      link.dataset.chapter = pathway.id;
      link.innerHTML = '<span class="shelf-chapter-num shelf-chapter-icon" aria-hidden="true"></span>' +
        '<span class="shelf-chapter-name"></span><span class="shelf-chapter-count"></span>';
      var chipIcon = link.querySelector(".shelf-chapter-icon");
      var labelIcon = pathway.querySelector(".module-cluster-label").dataset.icon;
      if (labelIcon) setIcon(chipIcon, labelIcon);
      else chipIcon.textContent = chapterNumber(text, index);
      link.querySelector(".shelf-chapter-name").textContent = shortChapter(text) || text;
      link.title = text;
      link.addEventListener("click", function (event) {
        event.preventDefault();
        var browser = document.getElementById("catalog-browser");
        // Land just under the sticky subject bar (it sits below the site header).
        var offset = browser ? Math.max(0, browser.getBoundingClientRect().bottom) + 12 : 16;
        window.scrollTo({ top: pathway.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
        var first = pathway.querySelector(".tile:not(.shelf-miss)");
        if (first) first.focus({ preventScroll: true });
      });
      li.appendChild(link);
      chips.appendChild(li);
      updateChapterMeta(pathway);
    });

    bar.appendChild(find);
    bar.appendChild(chips);
    grid.insertBefore(bar, pathways[0]);

    function refreshCounts() {
      chips.querySelectorAll("a[data-chapter]").forEach(function (link) {
        var pathway = document.getElementById(link.dataset.chapter);
        var count = visibleTiles(pathway).length;
        link.querySelector(".shelf-chapter-count").textContent = count;
        link.parentNode.hidden = count === 0;
      });
      pathways.forEach(updateChapterMeta);
    }

    function filterShelf() {
      var query = input.value.trim();
      var ranker = window.ClassroomOSSearchRank;
      var shelfTiles = Array.prototype.slice.call(section.querySelectorAll(".lesson-pathway .tile"));
      var keep = null;
      if (query && ranker) {
        keep = new Set(ranker.rank(shelfTiles, query, {
          fields: {
            title: function (tile) { var s = tile.querySelector("strong"); return s ? s.textContent : ""; },
            keywords: function (tile) { return kickerParts(tile).concat(tile.querySelector(".tile-topics") ? tile.querySelector(".tile-topics").textContent : ""); },
            // The topic group ("Robotics") and kind ("person"), but not the chapter
            // title: "…& Robotics" would make every lesson in it match "robot".
            topic: function (tile) {
              var era = tile.previousElementSibling;
              while (era && !era.classList.contains("module-era-label")) era = era.previousElementSibling;
              return [era ? era.textContent : "", tile.dataset.lessonKind || ""];
            },
            description: function (tile) { var s = tile.querySelector("small"); return s ? s.textContent : ""; }
          }
        }).map(function (result) { return result.item; }));
      }
      var shown = 0;
      shelfTiles.forEach(function (tile) {
        var miss = Boolean(keep) && !keep.has(tile);
        tile.classList.toggle("shelf-miss", miss);
        if (!miss && !tile.classList.contains("grade-hidden")) shown += 1;
      });
      section.querySelectorAll(".lesson-pathway-track .module-era-label").forEach(function (era) {
        var any = false;
        for (var next = era.nextElementSibling; next && !next.classList.contains("module-era-label"); next = next.nextElementSibling) {
          if (next.classList.contains("tile") && !next.classList.contains("shelf-miss")) { any = true; break; }
        }
        era.classList.toggle("shelf-miss", !any);
      });
      pathways.forEach(function (pathway) {
        pathway.classList.toggle("shelf-miss", Boolean(keep) && !pathway.querySelector(".tile:not(.shelf-miss)"));
      });
      section.classList.toggle("shelf-filtered", Boolean(keep));
      status.textContent = keep ? (shown ? shown + (shown === 1 ? " match" : " matches") : "No lessons match") : "";
      refreshCounts();
    }

    var timer = 0;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(filterShelf, 120);
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && input.value) {
        event.stopPropagation();
        input.value = "";
        filterShelf();
      } else if (event.key === "Enter") {
        var first = section.querySelector(".lesson-pathway .tile:not(.shelf-miss):not(.grade-hidden):not(.lesson-hidden)");
        if (first) first.focus();
      }
    });

    refreshCounts();
    // Grade and library-search filters hide tiles too; keep the chapter counts honest.
    new MutationObserver(function () {
      clearTimeout(section._shelfCountTimer);
      section._shelfCountTimer = setTimeout(refreshCounts, 60);
    }).observe(section, { subtree: true, attributes: true, attributeFilter: ["class"] });
  });

  // ── Layout toggle ─────────────────────────────────────────────────────────

  var group = document.createElement("div");
  group.className = "lesson-view-toggle";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Lesson layout");
  group.innerHTML =
    '<button type="button" data-lesson-view="index" title="Compact rows: what each lesson is, its grades and what is inside">Guide</button>' +
    '<button type="button" data-lesson-view="cards" title="Picture cards">Cards</button>';
  actions.appendChild(group);

  function applyView(view) {
    document.body.classList.toggle("lessons-view-index", view === "index");
    document.body.classList.toggle("lessons-view-cards", view === "cards");
    group.querySelectorAll("button").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.lessonView === view));
    });
  }

  group.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-lesson-view]");
    if (!button) return;
    applyView(button.dataset.lessonView);
    saveView(button.dataset.lessonView);
  });

  applyView(readView());
})();
