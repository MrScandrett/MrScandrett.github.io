(function () {
  "use strict";

  const script = document.currentScript;
  const main = document.querySelector("main");
  if (!script || !main) return;

  const siteRoot = new URL("../../", script.src);
  const lessonPath = decodeURI(location.pathname.slice(siteRoot.pathname.length));
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = new URL("css/lessons/math-pathway.css", new URL("../", script.src)).href;
  document.head.appendChild(stylesheet);

  const MEMORY_KEY = "classroomos:memory:v1";
  const CHECKS_KEY = "classroomos:math-checks:v1";

  const node = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
  };
  const pageUrl = (path) => new URL(path, siteRoot).href;

  function loadVisitedLessons() {
    try {
      const raw = JSON.parse(localStorage.getItem(MEMORY_KEY));
      return (raw && raw.lessons && typeof raw.lessons === "object") ? raw.lessons : {};
    } catch (e) {
      return {};
    }
  }

  function loadSelfChecks() {
    try {
      const raw = JSON.parse(localStorage.getItem(CHECKS_KEY));
      return (raw && typeof raw === "object") ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function saveSelfCheck(key, checked) {
    try {
      const checks = loadSelfChecks();
      if (checked) checks[key] = Date.now();
      else delete checks[key];
      localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
    } catch (e) {
      /* ignore private-mode storage restrictions */
    }
  }

  function isStepVisited(step, visitedMap, selfChecks) {
    const basePage = step.page.split("#")[0];
    return Boolean(visitedMap[step.page] || visitedMap[basePage] || selfChecks[step.page] || selfChecks[basePage]);
  }

  function createScratchpad() {
    const isLab = lessonPath.endsWith("math-foundations-lab.html");
    if (isLab) return null; // math-foundations-lab has per-station notebooks

    const box = node("details", "math-scratchpad");
    box.setAttribute("data-no-print", "");
    const summary = node("summary", "math-scratchpad-summary");
    summary.append(
      node("span", "math-scratchpad-title", "Open Math Scratchpad · Draw, calculate & work it out"),
      node("span", "math-scratchpad-hint", "Grid / Lined paper")
    );
    box.append(summary);

    const body = node("div", "math-scratchpad-body");
    const toolbar = node("div", "math-scratchpad-toolbar");
    const toolsGroup = node("div", "math-scratchpad-group");

    const penBtn = node("button", "math-scratchpad-btn is-active", "Pen");
    penBtn.type = "button";
    const accentBtn = node("button", "math-scratchpad-btn", "Highlight");
    accentBtn.type = "button";
    const eraserBtn = node("button", "math-scratchpad-btn", "Eraser");
    eraserBtn.type = "button";
    const paperBtn = node("button", "math-scratchpad-btn", "Paper: Grid");
    paperBtn.type = "button";
    const undoBtn = node("button", "math-scratchpad-btn", "Undo");
    undoBtn.type = "button";
    const clearBtn = node("button", "math-scratchpad-btn", "Clear");
    clearBtn.type = "button";

    toolsGroup.append(penBtn, accentBtn, eraserBtn, paperBtn, undoBtn, clearBtn);
    toolbar.append(toolsGroup);

    const sheet = node("div", "math-scratchpad-sheet is-grid");
    const canvas = document.createElement("canvas");
    canvas.className = "math-scratchpad-canvas";
    canvas.setAttribute("aria-label", "Math scratchpad drawing canvas. Use the notes field next to it for keyboard work.");
    sheet.append(canvas);

    const notesWrap = node("div", "math-scratchpad-notes");
    const notesLabel = node("label", "math-scratchpad-notes-label", "Keyboard Scratchpad & Notes");
    const notesArea = document.createElement("textarea");
    notesArea.className = "math-scratchpad-textarea";
    notesArea.rows = 6;
    notesArea.placeholder = "Type equations, intermediate steps, or predictions here...\nExample:\n  1) Estimate: ...\n  2) Calculate: ...\n  3) Check: ...";
    notesLabel.append(notesArea);
    notesWrap.append(notesLabel);

    const workspace = node("div", "math-scratchpad-workspace");
    workspace.append(sheet, notesWrap);
    body.append(toolbar, workspace);
    box.append(body);

    let tool = "pen";
    let strokes = [];
    let activeStroke = null;
    let drawing = false;
    let dpr = 1;
    let width = 0;
    let height = 220;
    let ctx = null;

    function resize() {
      const rect = sheet.getBoundingClientRect();
      if (!rect.width) return;
      width = rect.width;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    }

    function redraw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      const inkColor = getComputedStyle(box).getPropertyValue("--math-ink").trim() || "#17233a";
      const blueColor = getComputedStyle(box).getPropertyValue("--math-blue").trim() || "#3157a4";
      strokes.forEach((stroke) => {
        ctx.save();
        if (stroke.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = 18;
          ctx.strokeStyle = "#000";
        } else if (stroke.tool === "accent") {
          ctx.globalCompositeOperation = "source-over";
          ctx.lineWidth = 8;
          ctx.strokeStyle = blueColor;
          ctx.globalAlpha = 0.35;
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = inkColor;
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        stroke.points.forEach((pt, idx) => {
          const x = pt.x * width;
          const y = pt.y * height;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();
      });
    }

    function setTool(nextTool, activeBtn) {
      tool = nextTool;
      [penBtn, accentBtn, eraserBtn].forEach((b) => b.classList.toggle("is-active", b === activeBtn));
    }

    penBtn.addEventListener("click", () => setTool("pen", penBtn));
    accentBtn.addEventListener("click", () => setTool("accent", accentBtn));
    eraserBtn.addEventListener("click", () => setTool("eraser", eraserBtn));
    paperBtn.addEventListener("click", () => {
      const isGrid = sheet.classList.toggle("is-grid");
      sheet.classList.toggle("is-lined", !isGrid);
      paperBtn.textContent = isGrid ? "Paper: Grid" : "Paper: Lined";
    });
    undoBtn.addEventListener("click", () => {
      strokes.pop();
      redraw();
    });
    clearBtn.addEventListener("click", () => {
      strokes = [];
      redraw();
    });

    function getPoint(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1))),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1)))
      };
    }

    canvas.addEventListener("pointerdown", (e) => {
      if (!ctx) resize();
      drawing = true;
      activeStroke = { tool, points: [getPoint(e)] };
      strokes.push(activeStroke);
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      redraw();
      e.preventDefault();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drawing || !activeStroke) return;
      activeStroke.points.push(getPoint(e));
      redraw();
      e.preventDefault();
    });
    const stopDrawing = () => {
      drawing = false;
      activeStroke = null;
    };
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);

    box.addEventListener("toggle", () => {
      if (box.open) requestAnimationFrame(resize);
    });
    window.addEventListener("resize", () => {
      if (box.open) resize();
    });

    return box;
  }

  fetch(pageUrl("data/math-pathway.json"))
    .then((response) => {
      if (!response.ok) throw new Error("Math pathway data unavailable");
      return response.json();
    })
    .then((data) => {
      const guide = data.guides && data.guides[lessonPath];
      const steps = data.steps || [];
      if (!guide || !steps.length) return;

      const indices = steps.reduce((found, step, index) => {
        if (step.page.split("#")[0] === lessonPath) found.push(index);
        return found;
      }, []);
      if (!indices.length) return;

      const guidePanel = node("section", "math-lesson-guide");
      guidePanel.setAttribute("aria-label", "Start this mathematics lesson");
      const header = node("div", "math-lesson-guide-header");
      header.append(node("span", "math-lesson-guide-kicker", "Your learning route · " + guide.role));
      const levelLabel = node("span", "math-lesson-guide-level");
      header.append(levelLabel);
      guidePanel.append(header);

      const body = node("div", "math-lesson-guide-body");
      const overview = node("div", "math-lesson-guide-overview");
      overview.append(node("h2", "", "What you will learn"));
      overview.append(node("p", "", guide.goal));
      const readiness = node("p", "math-lesson-guide-readiness");
      readiness.append(node("strong", "", "Helpful to know: "));
      readiness.append(document.createTextNode(guide.prerequisite));
      overview.append(readiness);
      body.append(overview);

      const action = node("div", "math-lesson-guide-action");
      action.append(node("strong", "", "Start here"));
      action.append(node("p", "", guide.start));
      const startLink = node("a", "math-lesson-guide-start", "Go to the first task");
      startLink.href = "#" + guide.anchor;
      action.append(startLink);
      body.append(action);
      guidePanel.append(body);

      const checkRow = node("div", "math-lesson-guide-check");
      const checkLabel = node("label", "math-lesson-guide-check-toggle");
      const checkInput = document.createElement("input");
      checkInput.type = "checkbox";
      checkInput.className = "math-lesson-guide-checkbox";
      const checkText = node("span", "math-lesson-guide-check-text");
      checkText.append(node("strong", "", "Before you leave: "));
      checkText.append(document.createTextNode(guide.check));
      const checkBadge = node("span", "math-lesson-guide-check-badge", "Mark ready");
      checkLabel.append(checkInput, checkText, checkBadge);
      checkRow.append(checkLabel);
      guidePanel.append(checkRow);

      const scratchpad = createScratchpad();
      if (scratchpad) guidePanel.append(scratchpad);

      if (guide.review) {
        const review = node("p", "math-lesson-guide-review");
        review.append(document.createTextNode("Source check · " + guide.review.scope + " · " + guide.review.date + " · "));
        const source = node("a", "", guide.review.source);
        source.href = guide.review.url;
        review.append(source);
        guidePanel.append(review);
      }

      const title = main.querySelector("h1");
      const hero = title && title.closest("section, header");
      if (hero && main.contains(hero)) hero.insertAdjacentElement("afterend", guidePanel);
      else main.prepend(guidePanel);

      const nav = node("nav", "math-pathway");
      nav.setAttribute("aria-label", "Continue learning mathematics");
      main.append(nav);

      function currentIndex() {
        const exact = indices.find((index) => steps[index].page === lessonPath + location.hash);
        return exact === undefined ? indices[0] : exact;
      }

      function makeStepLink(step, label, visited) {
        const link = node("a", "math-pathway-step" + (visited ? " is-visited" : ""));
        link.href = pageUrl(step.page);
        const meta = node("small", "");
        meta.textContent = label + (visited ? " · Visited ✓" : "");
        link.append(meta);
        link.append(node("strong", "", step.title));
        return link;
      }

      function syncCheckState(stepKey) {
        const checks = loadSelfChecks();
        const checked = Boolean(checks[stepKey] || checks[lessonPath]);
        checkInput.checked = checked;
        checkBadge.textContent = checked ? "Completed ✓" : "I can explain this";
        checkRow.classList.toggle("is-checked", checked);
      }

      checkInput.addEventListener("change", () => {
        const step = steps[currentIndex()];
        const key = step ? step.page : lessonPath;
        saveSelfCheck(key, checkInput.checked);
        syncCheckState(key);
        render();
      });

      function render() {
        const index = currentIndex();
        const step = steps[index];
        const level = data.levels.find((item) => item.id === step.level);
        if (!level) return;
        const visitedMap = loadVisitedLessons();
        const selfChecks = loadSelfChecks();
        const isLab = lessonPath.endsWith("math-foundations-lab.html");

        syncCheckState(step.page);

        levelLabel.textContent = isLab && !location.hash ? "K–12 starting points" : level.name + " · " + level.grades;
        if (isLab && location.hash) {
          startLink.href = location.hash;
          action.querySelector("p").textContent = "Explore the " + step.title.toLowerCase() + " station.";
        } else if (isLab) {
          startLink.href = "#" + guide.anchor;
          action.querySelector("p").textContent = guide.start;
        }

        nav.replaceChildren();
        const head = node("div", "math-pathway-head");
        const name = node("div");
        const sameLevel = steps.filter((item) => item.level === step.level);
        const visitedInLevel = sameLevel.filter((item) => isStepVisited(item, visitedMap, selfChecks)).length;
        name.append(node("strong", "", isLab && !location.hash ? "Choose a station to continue" : "Continue in " + level.name + " (" + level.grades + ")"));
        const subText = isLab && !location.hash
          ? "Pick your starting point and follow a station link."
          : "Lesson " + (sameLevel.indexOf(step) + 1) + " of " + sameLevel.length + " in this level" + (visitedInLevel > 0 ? " · " + visitedInLevel + " explored" : "");
        name.append(node("span", "", subText));
        head.append(name);

        const actionsWrap = node("div", "math-pathway-actions");
        const all = node("a", "math-pathway-browse", "Browse all math lessons");
        all.href = pageUrl("steam-lessons.html#module-math");
        actionsWrap.append(all);
        head.append(actionsWrap);
        nav.append(head);

        if (!isLab || location.hash) {
          const links = node("div", "math-pathway-links");
          if (steps[index - 1]) {
            links.append(makeStepLink(steps[index - 1], "Previous idea", isStepVisited(steps[index - 1], visitedMap, selfChecks)));
          }
          if (steps[index + 1]) {
            links.append(makeStepLink(steps[index + 1], "Next idea", isStepVisited(steps[index + 1], visitedMap, selfChecks)));
          }
          nav.append(links);
        }

        const drawer = node("details", "math-pathway-map");
        const summary = node("summary", "math-pathway-map-summary");
        summary.append(
          node("span", "math-pathway-map-title", "View all " + sameLevel.length + " lessons in " + level.name),
          node("span", "math-pathway-map-progress", visitedInLevel + " / " + sameLevel.length + " explored")
        );
        drawer.append(summary);

        const list = node("ol", "math-pathway-map-list");
        sameLevel.forEach((lvlStep, idx) => {
          const li = node("li", "math-pathway-map-item");
          const isCurrent = lvlStep.page === step.page;
          const visited = isStepVisited(lvlStep, visitedMap, selfChecks);
          if (isCurrent) li.classList.add("is-current");
          if (visited) li.classList.add("is-visited");
          const a = node("a", "math-pathway-map-link");
          a.href = pageUrl(lvlStep.page);
          if (isCurrent) a.setAttribute("aria-current", "page");
          const num = node("span", "math-pathway-map-num", visited && !isCurrent ? "✓" : String(idx + 1));
          const titleSpan = node("span", "math-pathway-map-label", lvlStep.title);
          a.append(num, titleSpan);
          li.append(a);
          list.append(li);
        });
        drawer.append(list);

        const levelSwitcher = node("div", "math-pathway-levels");
        levelSwitcher.append(node("span", "math-pathway-levels-label", "Jump to another band:"));
        data.levels.forEach((lvl) => {
          const firstInLvl = steps.find((s) => s.level === lvl.id);
          if (!firstInLvl) return;
          const pill = node("a", "math-pathway-level-pill" + (lvl.id === level.id ? " is-active" : ""), "L" + lvl.id + " · " + lvl.name);
          pill.href = pageUrl(firstInLvl.page);
          pill.title = lvl.name + " (" + lvl.grades + ")";
          levelSwitcher.append(pill);
        });
        drawer.append(levelSwitcher);
        nav.append(drawer);
      }

      render();
      window.addEventListener("hashchange", render);
      window.addEventListener("classroomos:memorychange", render);
    })
    .catch((error) => {
      console.warn("Mathematics pathway could not load:", error);
    });
})();
