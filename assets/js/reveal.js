/**
 * reveal.js — Universal scroll reveal (static + dynamic content)
 *
 * Static usage — add class to HTML:
 *   <div class="reveal">...</div>
 *
 *   <div class="reveal-group">          ← auto-staggers direct children
 *     <div class="reveal">Card 1</div>
 *     <div class="reveal">Card 2</div>
 *   </div>
 *
 * Dynamic usage — just add the class when creating elements in JS.
 *   MutationObserver picks them up automatically.
 */

(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const intersectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        intersectionObserver.unobserve(entry.target); // fire once
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -32px 0px'
  });

  // Observe a single element — skip if already revealed
  function watch(el) {
    if (el.classList.contains('is-visible')) return;
    intersectionObserver.observe(el);
  }

  // Assign stagger index to unvisited .reveal siblings within a .reveal-group
  function assignGroupStagger(root) {
    (root || document).querySelectorAll('.reveal-group').forEach(function (group) {
      var children = Array.prototype.slice.call(
        group.querySelectorAll(':scope > .reveal')
      );
      children.forEach(function (el, i) {
        el.style.setProperty('--i', i);
      });
    });
  }

  // Assign stagger to cards in a flat grid (no .reveal-group wrapper)
  // Index is based on position among currently unvisited siblings
  function assignGridStagger(parent) {
    if (!parent) return;
    var unvisited = Array.prototype.slice.call(parent.children).filter(function (el) {
      return el.classList.contains('reveal') && !el.classList.contains('is-visible');
    });
    unvisited.forEach(function (el, i) {
      el.style.setProperty('--i', i);
    });
  }

  function init() {
    // Static elements already in the DOM
    assignGroupStagger();
    document.querySelectorAll('.reveal').forEach(watch);

    // Watch for dynamically injected .reveal elements (e.g. JS-rendered cards)
    var mutationObserver = new MutationObserver(function (mutations) {
      var newReveals = [];
      var affectedParents = new Set();

      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return; // elements only

          if (node.classList.contains('reveal')) {
            newReveals.push(node);
            affectedParents.add(node.parentElement);
          }

          // Catch .reveal elements nested inside added containers
          var nested = node.querySelectorAll ? node.querySelectorAll('.reveal') : [];
          Array.prototype.slice.call(nested).forEach(function (el) {
            newReveals.push(el);
            affectedParents.add(el.parentElement);
          });
        });
      });

      if (!newReveals.length) return;

      // Re-assign stagger for every affected parent grid
      affectedParents.forEach(function (parent) {
        if (!parent) return;
        // .reveal-group uses explicit group stagger
        if (parent.classList && parent.classList.contains('reveal-group')) {
          assignGroupStagger(parent.closest('.reveal-group') || document);
        } else {
          assignGridStagger(parent);
        }
      });

      // Start observing new elements
      newReveals.forEach(watch);
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
