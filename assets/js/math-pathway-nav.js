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

  const node = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
  };
  const pageUrl = (path) => new URL(path, siteRoot).href;

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
      const check = node("p", "math-lesson-guide-check");
      check.append(node("strong", "", "Before you leave: "));
      check.append(document.createTextNode(guide.check));
      guidePanel.append(check);
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

      function makeStepLink(step, label) {
        const link = node("a", "math-pathway-step");
        link.href = pageUrl(step.page);
        link.append(node("small", "", label));
        link.append(node("strong", "", step.title));
        return link;
      }

      function render() {
        const index = currentIndex();
        const step = steps[index];
        const level = data.levels.find((item) => item.id === step.level);
        if (!level) return;
        const isLab = lessonPath.endsWith("math-foundations-lab.html");
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
        name.append(node("strong", "", isLab && !location.hash ? "Choose a station to continue" : "Continue in " + level.name));
        name.append(node("span", "", isLab && !location.hash ? "Pick your starting point and follow a station link." : "Lesson " + (sameLevel.indexOf(step) + 1) + " of " + sameLevel.length + " in this level"));
        head.append(name);
        const all = node("a", "", "Browse all math lessons");
        all.href = pageUrl("steam-lessons.html#module-math");
        head.append(all);
        nav.append(head);

        if (!isLab || location.hash) {
          const links = node("div", "math-pathway-links");
          if (steps[index - 1]) links.append(makeStepLink(steps[index - 1], "Previous idea"));
          if (steps[index + 1]) links.append(makeStepLink(steps[index + 1], "Next idea"));
          nav.append(links);
        }
      }

      render();
      window.addEventListener("hashchange", render);
    })
    .catch((error) => {
      console.warn("Mathematics pathway could not load:", error);
    });
})();
