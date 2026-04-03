/**
 * Event Horizon Telescope - Interactivity Module (Phase 3)
 *
 * Connects UI interactions to visual feedback:
 * - Synchronization state → canvas blur/phase-noise effects
 * - Baseline hover → highlighting and tooltips
 * - Station selection → feedback animations
 * - Resolution changes → resolution display updates
 */

const EHTInteractivity = (() => {
  let currentSyncState = true;
  let selectedBaseline = null;
  let selectedStations = new Set();
  let reconstructionCanvas = null;
  let canvasContext = null;

  /**
   * Initialize interactivity handlers
   */
  function init() {
    setupCanvasReference();
    setupBaselineInteractions();
    setupStationInteractions();
    setupResolutionDisplay();
    setupSyncToggleListener();
  }

  /**
   * Get and store reference to reconstruction canvas
   */
  function setupCanvasReference() {
    reconstructionCanvas = document.querySelector('canvas');
    if (reconstructionCanvas) {
      canvasContext = reconstructionCanvas.getContext('2d');
    }
  }

  /**
   * Setup baseline hover/click interactions
   */
  function setupBaselineInteractions() {
    const baselines = document.querySelectorAll('[data-baseline]');

    baselines.forEach((baseline) => {
      const baselineId = baseline.getAttribute('data-baseline');

      // Hover for tooltip
      baseline.addEventListener('mouseenter', (e) => {
        const [station1, station2] = baselineId.split('-');
        const distance = baseline.getAttribute('data-distance') || '?';
        const wavelength = baseline.getAttribute('data-wavelength') || 'unknown';

        const text = `${station1}–${station2}: ${distance} km`;
        const rect = baseline.getBoundingClientRect();

        EHTUI.createTooltip(`baseline-${baselineId}`, text, {
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
      });

      baseline.addEventListener('mouseleave', () => {
        EHTUI.removeTooltip(`baseline-${baselineId}`);
      });

      // Click to highlight
      baseline.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedBaseline === baselineId) {
          EHTUI.clearBaselineHighlight();
          selectedBaseline = null;
        } else {
          EHTUI.highlightBaseline(baselineId);
          selectedBaseline = baselineId;
          showBaselineInfo(baselineId);
        }
      });
    });
  }

  /**
   * Setup station click interactions
   */
  function setupStationInteractions() {
    const stations = document.querySelectorAll('[data-station]');

    stations.forEach((station) => {
      const stationId = station.getAttribute('data-station');

      station.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleStationSelection(stationId, station);
      });

      // Tooltip on hover
      station.addEventListener('mouseenter', () => {
        const name = station.getAttribute('data-station-name') || stationId;
        const rect = station.getBoundingClientRect();

        EHTUI.createTooltip(`station-${stationId}`, name, {
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
      });

      station.addEventListener('mouseleave', () => {
        EHTUI.removeTooltip(`station-${stationId}`);
      });
    });
  }

  /**
   * Toggle station selection and update visual feedback
   */
  function toggleStationSelection(stationId, element) {
    if (selectedStations.has(stationId)) {
      selectedStations.delete(stationId);
      element.classList.remove('selected');
      EHTUI.animateStationSelection(stationId, false);
    } else {
      selectedStations.add(stationId);
      element.classList.add('selected');
      EHTUI.animateStationSelection(stationId, true);
    }

    updateBaselineVisibility();
  }

  /**
   * Update baseline visibility based on selected stations
   */
  function updateBaselineVisibility() {
    const baselines = document.querySelectorAll('[data-baseline]');

    baselines.forEach((baseline) => {
      const [station1, station2] = baseline.getAttribute('data-baseline').split('-');
      const bothSelected = selectedStations.has(station1) && selectedStations.has(station2);

      if (selectedStations.size === 0) {
        baseline.style.opacity = '1';
      } else {
        baseline.style.opacity = bothSelected ? '1' : '0.3';
      }
    });
  }

  /**
   * Show detailed baseline information
   */
  function showBaselineInfo(baselineId) {
    const infoPanel = document.querySelector('[data-info="baseline"]');
    if (!infoPanel) return;

    const [station1, station2] = baselineId.split('-');
    const baseline = document.querySelector(`[data-baseline="${baselineId}"]`);

    const distance = baseline?.getAttribute('data-distance') || '?';
    const resolution = baseline?.getAttribute('data-resolution') || '?';

    const html = `
      <h3>Baseline: ${station1}–${station2}</h3>
      <p><strong>Distance:</strong> ${distance} km</p>
      <p><strong>Resolution:</strong> ${resolution} μarcsec</p>
      <p><em>Longer baselines provide finer angular resolution</em></p>
    `;

    infoPanel.innerHTML = html;
    EHTUI.slideInPanel(infoPanel, 'up', 300);
  }

  /**
   * Setup resolution display updates
   */
  function setupResolutionDisplay() {
    const display = document.querySelector('.eht-resolution-display');
    if (!display) return;

    // Initial value
    updateResolutionDisplay(1.0);
  }

  /**
   * Update resolution display with animation
   */
  function updateResolutionDisplay(quality) {
    const arcseconds = (1.0 / quality).toFixed(2);
    const display = document.querySelector('.resolution-value');

    if (display) {
      EHTUI.animateResolutionImprovement(quality, 800);
    }
  }

  /**
   * Setup sync toggle listener
   */
  function setupSyncToggleListener() {
    // Listen for state changes from main page
    const observer = new MutationObserver(() => {
      const isSynced = checkSyncState();
      if (isSynced !== currentSyncState) {
        currentSyncState = isSynced;
        handleSyncStateChange(isSynced);
      }
    });

    const stateElement = document.querySelector('[data-sync-state]');
    if (stateElement) {
      observer.observe(stateElement, {
        attributes: true,
        characterData: true,
        subtree: true,
      });
    }
  }

  /**
   * Check current synchronization state
   */
  function checkSyncState() {
    const syncIndicator = document.querySelector('[data-sync-state]');
    if (!syncIndicator) return true;

    return syncIndicator.getAttribute('data-sync-state') !== 'false';
  }

  /**
   * Handle synchronization state changes
   */
  function handleSyncStateChange(isSynced) {
    EHTAnimations.setSynchronized(isSynced);

    if (!canvasContext || !reconstructionCanvas) return;

    if (!isSynced) {
      // Apply desync effects: blur and phase noise
      applyDesyncEffects();
    } else {
      // Animate back to clarity
      animateSyncRecovery();
    }
  }

  /**
   * Apply blur and phase noise when losing sync
   */
  function applyDesyncEffects() {
    let time = 0;

    EHTAnimations.animate(
      'desync-effect',
      (eased) => {
        time = eased * 1000;

        // Store current canvas state
        const imageData = canvasContext.getImageData(
          0,
          0,
          reconstructionCanvas.width,
          reconstructionCanvas.height
        );

        // Apply increasing blur
        EHTAnimations.effects.blur(canvasContext, eased * 8);

        // Apply phase noise
        EHTAnimations.effects.phaseNoise(canvasContext, eased * 0.4, time);
      },
      1200,
      'easeInQuad'
    );
  }

  /**
   * Animate recovery from desynchronization
   */
  function animateSyncRecovery() {
    EHTAnimations.animate(
      'desync-effect',
      (eased) => {
        // Decrease blur as we recover
        const inverseEased = 1 - eased;
        const blurAmount = inverseEased * 8;

        if (blurAmount > 0) {
          EHTAnimations.effects.blur(canvasContext, blurAmount);
        }

        // Fade out phase noise
        EHTAnimations.effects.phaseNoise(canvasContext, inverseEased * 0.4, eased * 1000);
      },
      800,
      'easeOutQuad',
      () => {
        // Clear animation to restore clean canvas
        canvasContext.clearRect(0, 0, reconstructionCanvas.width, reconstructionCanvas.height);
      }
    );
  }

  /**
   * Show resolution improvement feedback
   */
  function showResolutionImprovement(oldQuality, newQuality) {
    const improvement = ((newQuality - oldQuality) / oldQuality * 100).toFixed(1);

    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'resolution-improvement-feedback';
    feedbackEl.textContent = `+${improvement}% resolution`;
    feedbackEl.style.position = 'fixed';
    feedbackEl.style.top = '50%';
    feedbackEl.style.left = '50%';
    feedbackEl.style.transform = 'translate(-50%, -50%)';
    feedbackEl.style.color = '#2ecc71';
    feedbackEl.style.fontSize = '1.2rem';
    feedbackEl.style.fontWeight = 'bold';
    feedbackEl.style.pointerEvents = 'none';

    document.body.appendChild(feedbackEl);

    EHTAnimations.animate(
      'resolution-feedback',
      (eased) => {
        feedbackEl.style.opacity = 1 - eased;
        feedbackEl.style.transform = `translate(-50%, calc(-50% + ${eased * 20}px))`;
      },
      1000,
      'easeOutQuad',
      () => feedbackEl.remove()
    );
  }

  /**
   * Public API
   */
  return {
    /**
     * Initialize interactivity system
     */
    init: function () {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    },

    /**
     * Get current sync state
     */
    isSynchronized: function () {
      return currentSyncState;
    },

    /**
     * Set sync state (for external control)
     */
    setSyncState: function (isSynced) {
      if (isSynced !== currentSyncState) {
        currentSyncState = isSynced;
        handleSyncStateChange(isSynced);
      }
    },

    /**
     * Get selected baseline
     */
    getSelectedBaseline: function () {
      return selectedBaseline;
    },

    /**
     * Get selected stations
     */
    getSelectedStations: function () {
      return Array.from(selectedStations);
    },

    /**
     * Update resolution quality (0-1 range)
     */
    updateResolution: function (quality) {
      updateResolutionDisplay(quality);
    },

    /**
     * Show resolution improvement feedback
     */
    showResolutionImprovement: showResolutionImprovement,

    /**
     * Clear all selections
     */
    clearSelections: function () {
      selectedBaseline = null;
      selectedStations.clear();
      EHTUI.clearBaselineHighlight();
      document.querySelectorAll('[data-station].selected').forEach((el) => {
        el.classList.remove('selected');
      });
      updateBaselineVisibility();
    },

    /**
     * Get reconstruction canvas reference
     */
    getCanvas: function () {
      return reconstructionCanvas;
    },

    /**
     * Get canvas context
     */
    getCanvasContext: function () {
      return canvasContext;
    },
  };
})();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    EHTInteractivity.init();
  });
} else {
  EHTInteractivity.init();
}
