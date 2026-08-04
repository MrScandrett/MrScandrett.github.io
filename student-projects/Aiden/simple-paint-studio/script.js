/* script.js */

const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearBtn = document.getElementById('clearBtn');

let painting = false;

/**
 * Starts the drawing process
 */
function startPosition(e) {
    painting = true;
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
    ctx.strokeStyle = colorPicker.value;

    // Calculate mouse position relative to the canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Draw the line
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Start a new path from the current position to keep lines smooth
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Event Listeners
canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', finishedPosition);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseleave', finishedPosition); // Stops drawing if mouse leaves canvas

// Clear functionality
clearBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear your masterpiece?")) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
});
