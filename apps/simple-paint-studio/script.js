/* script.js */

const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearBtn = document.getElementById('clearBtn');
const eraserBtn = document.getElementById('eraserBtn');
const saveBtn = document.getElementById('saveBtn');

let painting = false;
let erasing = false;

/**
 * Fills the canvas with white so saved pictures have a background
 */
function fillWhite() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Converts a pointer position to canvas pixels
 * (the canvas can be shrunk to fit a small screen)
 */
function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

/**
 * Starts the drawing process
 */
function startPosition(e) {
    painting = true;
    canvas.setPointerCapture(e.pointerId);
    draw(e);
}

/**
 * Stops the drawing process and resets the path
 */
function finishedPosition() {
    painting = false;
    ctx.beginPath();
}

/**
 * Handles the actual drawing on the canvas
 */
function draw(e) {
    if (!painting) return;

    // Set brush styles based on current UI values
    ctx.lineWidth = brushSize.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = erasing ? '#ffffff' : colorPicker.value;

    const { x, y } = canvasPoint(e);

    // Draw the line
    ctx.lineTo(x, y);
    ctx.stroke();

    // Start a new path from the current position to keep lines smooth
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Pointer events work for mouse, touch screens, and pens
canvas.addEventListener('pointerdown', startPosition);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', finishedPosition);
canvas.addEventListener('pointercancel', finishedPosition);

// Eraser toggle
eraserBtn.addEventListener('click', () => {
    erasing = !erasing;
    eraserBtn.setAttribute('aria-pressed', String(erasing));
});

// Picking a color switches back to the brush
colorPicker.addEventListener('input', () => {
    erasing = false;
    eraserBtn.setAttribute('aria-pressed', 'false');
});

// Save the picture as a PNG file
saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'my-painting.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// Clear functionality
clearBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear your masterpiece?")) {
        fillWhite();
    }
});

fillWhite();

/* Shared fullscreen controls for creation tools, including browser-only fallback. */
(() => {
  'use strict';
  let expanded = null;
  const controls = new Map();
  function resize() {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new CustomEvent('creation-app-resize'));
    });
  }
  function sync() {
    controls.forEach((button, app) => {
      const active = document.fullscreenElement === app || expanded === app;
      button.textContent = active ? 'Exit full screen' : 'Full screen';
      button.setAttribute('aria-pressed', String(active));
    });
    resize();
  }
  function exitExpanded() {
    if (!expanded) return;
    const app = expanded;
    if (app.hidePopover && app.matches(':popover-open')) app.hidePopover();
    app.removeAttribute('popover');
    app.classList.remove('creation-app-expanded');
    expanded = null;
    document.documentElement.classList.remove('creation-app-locked');
    sync();
    controls.get(app).focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-creation-app]').forEach((app, i) => {
    if (!app.id) app.id = `creation-workspace-${i + 1}`;
    const bar = document.createElement('div');
    bar.className = 'creation-app-toolbar';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'creation-app-fullscreen';
    button.textContent = 'Full screen';
    button.setAttribute('aria-controls', app.id);
    button.setAttribute('aria-pressed', 'false');
    controls.set(app, button);
    button.addEventListener('click', async () => {
      if (expanded === app) { exitExpanded(); return; }
      if (document.fullscreenElement === app) {
        await document.exitFullscreen();
        button.focus({ preventScroll: true });
        return;
      }
      if (app.requestFullscreen && document.fullscreenEnabled) {
        try { await app.requestFullscreen(); sync(); return; }
        catch { /* Embedded/mobile browsers can reject fullscreen; expand in-page. */ }
      }
      exitExpanded();
      expanded = app;
      app.classList.add('creation-app-expanded');
      // The top layer keeps sticky site navigation from covering the exit control.
      if (app.showPopover) {
        app.setAttribute('popover', 'manual');
        try { app.showPopover(); }
        catch { app.removeAttribute('popover'); }
      }
      document.documentElement.classList.add('creation-app-locked');
      sync();
    });
    bar.append(button);
    app.prepend(bar);
  });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) { event.preventDefault(); exitExpanded(); }
  });
})();
