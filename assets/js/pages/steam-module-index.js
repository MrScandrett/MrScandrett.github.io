(function () {
  "use strict";

  // Enhance the subject shelves with chapter navigation, lesson search, and two layouts.
  // The catalog groups authored lesson tiles into chapters before this file runs.

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
    return band === "PreK-College" ? "All grades" : "Grades " + band.replace(/-/g, "–");
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
    document.querySelectorAll(".tile-icon[data-icon], .chapter-icon[data-icon]").forEach(pixelate);
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
    var chapter = tile.closest(".lesson-pathway");
    var chapterTitle = chapter && chapter.querySelector(".module-cluster-label strong");
    var chapterBand = chapterTitle && chapterTitle.textContent.match(/\(((?:K|\d+)[–-]\d+)\)\s*$/i);
    var grade = gradeLabel(tile.dataset.catalogGrade || meta.gradeBand || (chapterBand && chapterBand[1]));
    badges.innerHTML = '<span class="tile-type" data-type="' + type.toLowerCase() + '">' + type + "</span>" +
      (grade ? '<span class="tile-grade">' + grade + "</span>" : "");
    tile.dataset.lessonTopics = topicsFor(parts, meta).join(" ");
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
      var href = tile.getAttribute("href") || "";
      var lesson = byUrl[href];
      if (lesson) decorate(tile, lesson);
    });
    document.querySelectorAll(".lesson-pathway").forEach(updateChapterMeta);
  });

  // ── Chapters ──────────────────────────────────────────────────────────────

  function shortChapter(text) {
    return text.trim().replace(/\s*\((?:K|\d+)[–-]\d+\)\s*$/i, "");
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
    var tiles = visibleTiles(pathway);
    var planned = tiles.filter(function (tile) { return tile.classList.contains("tile-coming-soon"); }).length;
    var live = tiles.length - planned;
    meta.textContent = live + (live === 1 ? " lesson" : " lessons") + (planned ? " · " + planned + " planned" : "");
  }

  document.querySelectorAll(".module-section").forEach(function (section) {
    var grid = section.querySelector(".module-tile-grid");
    var pathways = Array.prototype.slice.call(section.querySelectorAll(".lesson-pathway"));
    if (!grid || !pathways.length) return;

    var bar = document.createElement("div");
    bar.className = "shelf-nav";

    var find = document.createElement("label");
    find.className = "shelf-find";
    find.innerHTML = '<span class="visually-hidden">Find a lesson in this subject</span>' +
      '<input type="search" autocomplete="off" spellcheck="false" placeholder="Find a lesson">';
    var input = find.querySelector("input");
    var status = document.createElement("span");
    status.className = "shelf-find-status";
    status.setAttribute("role", "status");

    var jump = document.createElement("form");
    jump.className = "shelf-jump";
    jump.innerHTML = '<select aria-label="Jump to chapter"><option value="">Jump to chapter</option></select>' +
      '<button type="submit" disabled>Go</button>';
    var select = jump.querySelector("select");
    var go = jump.querySelector("button");

    var chapters = pathways.map(function (pathway, index) {
      var title = pathway.querySelector(".module-cluster-label strong");
      if (!pathway.id) pathway.id = section.id + "-chapter-" + (index + 1);
      return { pathway: pathway, title: shortChapter(title.textContent) };
    });

    function focusChapter(pathway) {
      var heading = pathway.querySelector(".module-cluster-label strong");
      var browser = document.getElementById("catalog-browser");
      var position = browser && window.getComputedStyle(browser);
      var offset = position ? (parseFloat(position.top) || 0) + browser.offsetHeight + 12 : 16;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      window.scrollTo({ top: pathway.getBoundingClientRect().top + window.scrollY - offset,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }

    select.addEventListener("change", function () { go.disabled = !select.value; });
    jump.addEventListener("submit", function (event) {
      event.preventDefault();
      var chapter = chapters.find(function (entry) { return entry.pathway.id === select.value; });
      if (chapter) focusChapter(chapter.pathway);
    });

    if (chapters.length > 1) bar.appendChild(jump);
    bar.append(find, status);
    grid.insertBefore(bar, grid.firstChild);

    function refreshCounts() {
      var selected = select.value;
      select.options.length = 1;
      chapters.forEach(function (chapter) {
        updateChapterMeta(chapter.pathway);
        var count = visibleTiles(chapter.pathway).length;
        chapter.pathway.classList.toggle("shelf-miss", Boolean(input.value.trim()) && count === 0);
        if (count) {
          select.add(new Option(chapter.title + " (" + count + ")", chapter.pathway.id));
        }
      });
      select.value = Array.from(select.options).some(function (option) { return option.value === selected; }) ? selected : "";
      select.disabled = select.options.length === 1;
      go.disabled = !select.value;
      if (input.value.trim()) {
        var shown = visibleTiles(grid).length;
        status.textContent = shown ? shown + (shown === 1 ? " match" : " matches") : "No matching lessons";
      } else {
        status.textContent = "";
      }
    }

    function filterShelf() {
      var query = input.value.trim();
      var ranker = window.ClassroomOSSearchRank;
      var shelfTiles = Array.prototype.slice.call(grid.querySelectorAll(".tile"));
      var keep = null;
      if (query && ranker) {
        keep = new Set(ranker.rank(shelfTiles, query, {
          fields: {
            title: function (tile) {
              var title = tile.querySelector("strong");
              if (!title) return "";
              return Array.from(title.childNodes).filter(function (part) {
                return part.nodeType !== Node.ELEMENT_NODE || !part.classList.contains("tile-new-badge");
              }).map(function (part) { return part.textContent; }).join("");
            },
            keywords: function (tile) { return kickerParts(tile).concat(tile.dataset.lessonTopics || ""); },
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
      shelfTiles.forEach(function (tile) {
        var miss = Boolean(keep) && !keep.has(tile);
        tile.classList.toggle("shelf-miss", miss);
      });
      section.querySelectorAll(".lesson-pathway-track .module-era-label").forEach(function (era) {
        var any = false;
        for (var next = era.nextElementSibling; next && !next.classList.contains("module-era-label"); next = next.nextElementSibling) {
          if (next.classList.contains("tile") && !next.classList.contains("shelf-miss")) { any = true; break; }
        }
        era.classList.toggle("shelf-miss", !any);
      });
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
        clearTimeout(timer);
        filterShelf();
        var first = visibleTiles(grid).find(function (tile) { return tile.matches("a[href]"); });
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
    '<button type="button" data-lesson-view="index" title="Show lessons as a list">List</button>' +
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
