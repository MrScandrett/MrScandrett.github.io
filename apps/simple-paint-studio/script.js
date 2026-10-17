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
