(() => {
  "use strict";

  const enhanceTimeline = (timeline) => {
    const events = [...timeline.querySelectorAll(".timeline-event")];
    if (!events.length) return;

    timeline.setAttribute("role", "list");
    events.forEach((event) => event.setAttribute("role", "listitem"));

    const scroller = timeline.closest(".timeline-scroller");
    if (!scroller) return;
    scroller.tabIndex = 0;
    scroller.addEventListener("keydown", (keyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(keyboardEvent.key)) return;
      keyboardEvent.preventDefault();
      const direction = keyboardEvent.key === 'ArrowRight' ? 1 : -1;
      scroller.scrollBy({ left: direction * Math.min(scroller.clientWidth * .8, 320), behavior: "smooth" });
    });
  };

  document.querySelectorAll("[data-timeline]").forEach(enhanceTimeline);
})();
