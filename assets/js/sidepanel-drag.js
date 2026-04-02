/**
 * Sidepanel Drag-and-Drop Module
 * Enables users to reorder components in sidepanels (like iPhone home screen)
 * Persists layout preferences to localStorage
 */

(function () {
  const STORAGE_KEY = 'classroomos-sidepanel-layout';
  const DEFAULT_LAYOUT = {
    sidepanel_left: ['votd'],
    sidepanel_right: ['weather', 'vod']
  };

  let currentLayout = { ...DEFAULT_LAYOUT };
  let draggedElement = null;
  let draggedComponentId = null;

  /**
   * Initialize drag-and-drop for all sidepanel components
   */
  function initSidepanelDrag() {
    const components = document.querySelectorAll('[data-component-id][draggable="true"]');
    
    components.forEach((component) => {
      component.addEventListener('dragstart', onDragStart);
      component.addEventListener('dragend', onDragEnd);
    });

    // Add drop zone listeners to sidepanels
    const sidepanels = document.querySelectorAll('.sidepanel');
    sidepanels.forEach((sidepanel) => {
      sidepanel.addEventListener('dragover', onDragOver);
      sidepanel.addEventListener('drop', onDrop);
      sidepanel.addEventListener('dragleave', onDragLeave);
    });
  }

  /**
   * Handle drag start
   */
  function onDragStart(e) {
    draggedElement = this;
    draggedComponentId = this.dataset.componentId;
    
    // Set visual feedback
    this.classList.add('dragging');
    this.style.opacity = '0.6';
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);

    // Optional: Create custom drag image
    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.pointerEvents = 'none';
    dragImage.style.opacity = '0.8';
    dragImage.innerHTML = this.innerHTML;
    dragImage.style.background = '#f5f5f5';
    dragImage.style.padding = '10px';
    dragImage.style.borderRadius = '8px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => dragImage.remove(), 0);
  }

  /**
   * Handle drag over
   */
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Highlight drop zone
    this.classList.add('drag-over');
    
    // Get all components in this sidepanel
    const components = this.querySelectorAll('[data-component-id]');
    const rect = this.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    
    // Reorder visual feedback: show insertion point
    components.forEach((comp) => {
      const compRect = comp.getBoundingClientRect();
      const compMidpoint = compRect.top + compRect.height / 2;
      
      if (draggedElement && draggedElement !== comp && e.clientY < compMidpoint) {
        comp.style.marginTop = '40px'; // Create space for insertion
      } else {
        comp.style.marginTop = '0';
      }
    });
  }

  /**
   * Handle drag leave
   */
  function onDragLeave(e) {
    if (e.target === this) {
      this.classList.remove('drag-over');
      
      // Reset all components
      const components = this.querySelectorAll('[data-component-id]');
      components.forEach((comp) => {
        comp.style.marginTop = '0';
      });
    }
  }

  /**
   * Handle drop
   */
  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const targetSidepanel = this;
    targetSidepanel.classList.remove('drag-over');
    
    if (!draggedElement || !draggedComponentId) return;
    
    // Get the target sidepanel ID
    const targetPanelId = targetSidepanel.id || (targetSidepanel.classList.contains('sidepanel-left') ? 'sidepanel_left' : 'sidepanel_right');
    const sourcePanelId = draggedElement.parentElement.id || (draggedElement.parentElement.classList.contains('sidepanel-left') ? 'sidepanel_left' : 'sidepanel_right');
    
    // Determine insertion point
    const components = Array.from(targetSidepanel.querySelectorAll('[data-component-id]'));
    let insertBefore = null;
    
    components.forEach((comp) => {
      const rect = comp.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        insertBefore = comp;
      }
    });
    
    // Update DOM
    if (insertBefore) {
      targetSidepanel.insertBefore(draggedElement, insertBefore);
    } else {
      targetSidepanel.appendChild(draggedElement);
    }
    
    // Reset styles
    draggedElement.style.opacity = '1';
    draggedElement.style.marginTop = '0';
    draggedElement.classList.remove('dragging');
    
    // Update layout tracking
    updateLayoutOrder();
    saveSidepanelLayout();
  }

  /**
   * Handle drag end
   */
  function onDragEnd(e) {
    this.classList.remove('dragging');
    this.style.opacity = '1';
    this.style.marginTop = '0';
    
    // Clear all drop zone highlights
    document.querySelectorAll('.sidepanel').forEach((panel) => {
      panel.classList.remove('drag-over');
      panel.querySelectorAll('[data-component-id]').forEach((comp) => {
        comp.style.marginTop = '0';
      });
    });
    
    draggedElement = null;
    draggedComponentId = null;
  }

  /**
   * Update the layout tracking object based on current DOM order
   */
  function updateLayoutOrder() {
    const leftPanel = document.querySelector('.sidepanel-left');
    const rightPanel = document.querySelector('.sidepanel-right');
    
    currentLayout.sidepanel_left = Array.from(leftPanel.querySelectorAll('[data-component-id]'))
      .map((el) => el.dataset.componentId);
    
    currentLayout.sidepanel_right = Array.from(rightPanel.querySelectorAll('[data-component-id]'))
      .map((el) => el.dataset.componentId);
  }

  /**
   * Save layout to localStorage
   */
  function saveSidepanelLayout() {
    const layout = {
      ...currentLayout,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      console.log('[Sidepanel Drag] Layout saved:', layout);
    } catch (error) {
      console.warn('[Sidepanel Drag] Failed to save layout:', error);
    }
  }

  /**
   * Load layout from localStorage
   */
  function loadSidepanelLayout() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const layout = JSON.parse(saved);
        if (layout.sidepanel_left && layout.sidepanel_right) {
          currentLayout = {
            sidepanel_left: layout.sidepanel_left,
            sidepanel_right: layout.sidepanel_right
          };
          console.log('[Sidepanel Drag] Layout loaded:', currentLayout);
          applySavedLayout();
          return;
        }
      }
    } catch (error) {
      console.warn('[Sidepanel Drag] Failed to load layout:', error);
    }
    
    // Use default if no saved layout
    console.log('[Sidepanel Drag] Using default layout');
  }

  /**
   * Apply saved layout by reordering DOM elements
   */
  function applySavedLayout() {
    const leftPanel = document.querySelector('.sidepanel-left');
    const rightPanel = document.querySelector('.sidepanel-right');
    
    if (!leftPanel || !rightPanel) return;
    
    // Reorder left panel
    currentLayout.sidepanel_left.forEach((componentId) => {
      const component = document.querySelector(`[data-component-id="${componentId}"]`);
      if (component && component.parentElement === leftPanel) {
        leftPanel.appendChild(component); // Move to end (reorder)
      }
    });
    
    // Reorder right panel
    currentLayout.sidepanel_right.forEach((componentId) => {
      const component = document.querySelector(`[data-component-id="${componentId}"]`);
      if (component && component.parentElement === rightPanel) {
        rightPanel.appendChild(component); // Move to end (reorder)
      }
    });
  }

  /**
   * Reset layout to default
   */
  function resetSidepanelLayout() {
    if (confirm('Reset sidepanel layout to default?')) {
      currentLayout = { ...DEFAULT_LAYOUT };
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  }

  /**
   * Initialize on page load
   */
  function init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        loadSidepanelLayout();
        initSidepanelDrag();
      });
    } else {
      loadSidepanelLayout();
      initSidepanelDrag();
    }
  }

  // Expose reset function globally for settings/ui
  window.resetSidepanelLayout = resetSidepanelLayout;

  // Start initialization
  init();
})();
