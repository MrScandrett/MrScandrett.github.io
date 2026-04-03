/**
 * Event Horizon Telescope - UI & Interactivity Module
 *
 * Provides interactive UI enhancements:
 * - Collapsible section headers with smooth animations
 * - Tooltip system
 * - Baseline highlighting and selection
 * - Interactive feedback and state management
 */

const EHTUI = (() => {
  // Track collapse states
  const collapseStates = new Map();

  /**
   * Initialize collapsible sections
   * Finds all elements with data-collapsible attribute and makes them collapsible
   */
  function initCollapsible() {
    const collapsibles = document.querySelectorAll('[data-collapsible]');

    collapsibles.forEach((element) => {
      const id = element.getAttribute('data-collapsible');
      const header = element.querySelector('[data-collapsible-header]');
      const content = element.querySelector('[data-collapsible-content]');

      if (!header || !content) return;

      // Initialize state (default expanded)
      const isExpanded = element.getAttribute('data-expanded') !== 'false';
      collapseStates.set(id, isExpanded);

      // Set initial styles
      if (!isExpanded) {
        content.style.display = 'none';
        header.setAttribute('aria-expanded', 'false');
      } else {
        header.setAttribute('aria-expanded', 'true');
      }

      // Add click handler
      header.style.cursor = 'pointer';
      header.classList.add('collapsible-header');

      header.addEventListener('click', () => {
        toggleCollapsible(id, header, content);
      });

      // Add keyboard support (Enter/Space)
      if (!header.hasAttribute('tabindex')) {
        header.setAttribute('tabindex', '0');
      }

      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleCollapsible(id, header, content);
        }
      });
    });
  }

  /**
   * Toggle a collapsible section with animation
   */
  function toggleCollapsible(id, header, content) {
    const isExpanded = collapseStates.get(id);
    const newState = !isExpanded;

    collapseStates.set(id, newState);
    header.setAttribute('aria-expanded', newState ? 'true' : 'false');

    if (newState) {
      // Expanding
      expandSection(content, id, header);
    } else {
      // Collapsing
      collapseSection(content, id, header);
    }
  }

  /**
   * Animate section expansion
   */
  function expandSection(content, id, header) {
    content.style.display = 'block';
    content.style.overflow = 'hidden';

    // Get the full height
    const fullHeight = content.scrollHeight;

    // Animate height
    EHTAnimations.animate(
      `collapse-${id}`,
      (eased) => {
        content.style.maxHeight = `${eased * fullHeight}px`;
        content.style.opacity = eased;
      },
      300,
      'easeOutQuad',
      () => {
        content.style.maxHeight = 'none';
        content.style.overflow = 'visible';
      }
    );

    // Add expanded class to header
    header.classList.add('expanded');
  }

  /**
   * Animate section collapse
   */
  function collapseSection(content, id, header) {
    content.style.overflow = 'hidden';
    const currentHeight = content.scrollHeight;

    EHTAnimations.animate(
      `collapse-${id}`,
      (eased) => {
        const height = currentHeight * (1 - eased);
        content.style.maxHeight = `${height}px`;
        content.style.opacity = 1 - eased;
      },
      300,
      'easeInQuad',
      () => {
        content.style.display = 'none';
      }
    );

    // Remove expanded class from header
    header.classList.remove('expanded');
  }

  /**
   * Baseline highlighting system
   */
  function highlightBaseline(baselineId, color = '#3498db') {
    const baselineElement = document.querySelector(`[data-baseline="${baselineId}"]`);
    if (!baselineElement) return;

    // Remove previous highlights
    document.querySelectorAll('[data-baseline].highlighted').forEach((el) => {
      el.classList.remove('highlighted');
    });

    baselineElement.classList.add('highlighted');

    // Animate pulse
    EHTAnimations.animate(
      `baseline-highlight-${baselineId}`,
      (eased) => {
        baselineElement.style.opacity = 0.6 + eased * 0.4;
        baselineElement.style.strokeWidth = 1 + eased * 2;
      },
      600,
      'easeOutElastic'
    );
  }

  /**
   * Clear baseline highlighting
   */
  function clearBaselineHighlight() {
    document.querySelectorAll('[data-baseline].highlighted').forEach((el) => {
      el.classList.remove('highlighted');
      EHTAnimations.animate(
        `baseline-unhighlight-${el.getAttribute('data-baseline')}`,
        (eased) => {
          el.style.opacity = 0.6 + (1 - eased) * 0.4;
          el.style.strokeWidth = 1 + (1 - eased) * 2;
        },
        400,
        'easeOutQuad'
      );
    });
  }

  /**
   * Tooltip system
   */
  const tooltips = new Map();

  function createTooltip(id, text, position = { x: 0, y: 0 }) {
    // Remove existing tooltip
    if (tooltips.has(id)) {
      removeTooltip(id);
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'eht-tooltip';
    tooltip.id = `tooltip-${id}`;
    tooltip.textContent = text;
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${position.x}px`;
    tooltip.style.top = `${position.y}px`;

    document.body.appendChild(tooltip);
    tooltips.set(id, tooltip);

    // Animate in
    EHTAnimations.animate(
      `tooltip-show-${id}`,
      (eased) => {
        tooltip.style.opacity = eased;
        tooltip.style.transform = `translateY(${-8 * (1 - eased)}px)`;
      },
      200,
      'easeOutQuad'
    );

    return tooltip;
  }

  function removeTooltip(id) {
    const tooltip = tooltips.get(id);
    if (!tooltip) return;

    EHTAnimations.animate(
      `tooltip-hide-${id}`,
      (eased) => {
        tooltip.style.opacity = 1 - eased;
        tooltip.style.transform = `translateY(${-8 * eased}px)`;
      },
      200,
      'easeInQuad',
      () => {
        tooltip.remove();
        tooltips.delete(id);
      }
    );
  }

  /**
   * Station selection feedback
   */
  function animateStationSelection(stationId, isSelected) {
    const stationElement = document.querySelector(`[data-station="${stationId}"]`);
    if (!stationElement) return;

    if (isSelected) {
      EHTAnimations.animate(
        `station-select-${stationId}`,
        (eased) => {
          stationElement.style.transform = `scale(${1 + eased * 0.15})`;
          stationElement.style.filter = `drop-shadow(0 0 ${eased * 8}px rgba(52, 152, 219, 0.6))`;
        },
        400,
        'easeOutElastic'
      );
    } else {
      EHTAnimations.animate(
        `station-deselect-${stationId}`,
        (eased) => {
          stationElement.style.transform = `scale(${1.15 - eased * 0.15})`;
          stationElement.style.filter = `drop-shadow(0 0 ${(1 - eased) * 8}px rgba(52, 152, 219, 0.6))`;
        },
        300,
        'easeOutQuad'
      );
    }
  }

  /**
   * Panel slide animations
   */
  function slideInPanel(element, direction = 'up', duration = 400) {
    element.style.opacity = '0';
    const transforms = {
      up: 'translateY(20px)',
      down: 'translateY(-20px)',
      left: 'translateX(20px)',
      right: 'translateX(-20px)',
    };

    element.style.transform = transforms[direction] || transforms.up;

    EHTAnimations.animate(
      `slide-in-${element.id || Math.random()}`,
      (eased) => {
        element.style.opacity = eased;
        const transformValue = transforms[direction];
        const distance = 20 * (1 - eased);
        const axis = direction === 'up' || direction === 'down' ? 'Y' : 'X';
        const sign = direction === 'up' || direction === 'left' ? 1 : -1;

        element.style.transform = `translate${axis}(${sign * distance}px)`;
      },
      duration,
      'easeOutQuad'
    );
  }

  /**
   * Resolve animation - visual feedback for completed reconstructions
   */
  function animateResolutionImprovement(quality, duration = 1500) {
    const container = document.querySelector('.eht-resolution-display');
    if (!container) return;

    EHTAnimations.animate(
      'resolution-improve',
      (eased) => {
        const displayQuality = quality * eased;
        const arcseconds = (1.0 / displayQuality).toFixed(2);

        // Update text if element exists
        const text = container.querySelector('.resolution-value');
        if (text) {
          text.textContent = arcseconds;
        }

        // Visual feedback
        container.style.transform = `scale(${1 + eased * 0.1})`;
        container.style.color = `hsl(${120 + (1 - eased) * 60}, 100%, 50%)`;
      },
      duration,
      'easeOutQuint'
    );
  }

  /**
   * Public API
   */
  return {
    /**
     * Initialize all UI components
     */
    init: function () {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          initCollapsible();
        });
      } else {
        initCollapsible();
      }
    },

    /**
     * Programmatically toggle a collapsible section
     */
    toggleCollapsible: function (id) {
      const element = document.querySelector(`[data-collapsible="${id}"]`);
      if (!element) return false;

      const header = element.querySelector('[data-collapsible-header]');
      const content = element.querySelector('[data-collapsible-content]');

      if (header && content) {
        toggleCollapsible(id, header, content);
        return true;
      }
      return false;
    },

    /**
     * Expand a collapsible section
     */
    expandSection: function (id) {
      if (!collapseStates.get(id)) {
        const element = document.querySelector(`[data-collapsible="${id}"]`);
        if (element) {
          const header = element.querySelector('[data-collapsible-header]');
          const content = element.querySelector('[data-collapsible-content]');
          if (header && content) {
            expandSection(content, id, header);
            collapseStates.set(id, true);
          }
        }
      }
    },

    /**
     * Collapse a collapsible section
     */
    collapseSection: function (id) {
      if (collapseStates.get(id)) {
        const element = document.querySelector(`[data-collapsible="${id}"]`);
        if (element) {
          const header = element.querySelector('[data-collapsible-header]');
          const content = element.querySelector('[data-collapsible-content]');
          if (header && content) {
            collapseSection(content, id, header);
            collapseStates.set(id, false);
          }
        }
      }
    },

    // Baseline highlighting
    highlightBaseline: highlightBaseline,
    clearBaselineHighlight: clearBaselineHighlight,

    // Tooltips
    createTooltip: createTooltip,
    removeTooltip: removeTooltip,

    // Station feedback
    animateStationSelection: animateStationSelection,

    // Panel animations
    slideInPanel: slideInPanel,

    // Resolution feedback
    animateResolutionImprovement: animateResolutionImprovement,

    /**
     * Get collapse state
     */
    isExpanded: function (id) {
      return collapseStates.get(id) || false;
    },

    /**
     * Get all collapse states
     */
    getStates: function () {
      return Object.fromEntries(collapseStates);
    },
  };
})();

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    EHTUI.init();
  });
} else {
  EHTUI.init();
}
