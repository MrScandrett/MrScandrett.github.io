# Creative Coding + Demoscene Lab: Signal Garden

This project connects four ideas:

- **color theory** supplies a deliberate palette;
- **sine waves and Fourier thinking** create repeating motion;
- **smooth noise** creates variation that feels natural rather than purely random;
- **the demoscene mindset** builds a striking real-time piece from a small amount of code.

It runs in a browser with no library or internet connection.

## Your first 10-minute success

1. Open `index.html` in a browser.
2. Move the sliders and switch among Flow Field, Wave Choir, and Star Tunnel.
3. Press Space to pause and N for a new seed.
4. Open `sketch.js`, find `PALETTES`, change one hex color, save, and refresh.
5. Use Export PNG to save a frame you designed.

## Tutorial route

### 1. Coordinate space

Canvas uses x from left to right and y from top to bottom. Find `resizeCanvas()`
and notice how device pixel ratio keeps drawings sharp without changing the
logical coordinate system.

### 2. Repetition with sine

Open Wave Choir. Each horizontal ribbon is a sine wave with a different
frequency and phase. Change `layers` in `drawWaves()` and predict the density.

### 3. Coherent randomness

Open Flow Field. `valueNoise(x, y)` smoothly blends nearby random grid values.
That continuity is why particles form streams instead of television static.

### 4. Time as an input

Every scene receives `time` in seconds. Multiplying time changes speed; adding
time shifts phase. Pause the scene and verify that its geometry stops changing.

### 5. Composition

Choose one focal point, one dominant palette, and one form of motion. More
effects do not automatically make a stronger piece.

## Comment key

- `WHAT`: the job performed by a section;
- `WHY`: the visual or technical reason;
- `TRY THIS`: a controlled experiment;
- `MATH`: the relationship behind the image.

Continue with `challenges.md` when you can explain how time, frequency, amplitude,
and noise each change the composition.
