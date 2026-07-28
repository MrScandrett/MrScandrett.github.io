/*
 * adaptiveResolution — keeps the framerate up on whatever device you're on.
 *
 * A fixed pixel ratio can't be right everywhere. The original code hardcoded
 * 0.5, which made every machine render a quarter of the pixels and look blocky
 * even on hardware that could easily manage full resolution. Setting it to the
 * device ratio instead just moves the problem: a high-DPI tablet at ratio 2 is
 * asking the GPU for four times the pixels of a plain laptop.
 *
 * So don't guess. Watch how long frames actually take and change the render
 * scale to suit: drop it when frames run long, edge it back up when there's
 * headroom to spare. The canvas keeps its CSS size throughout, so this costs
 * sharpness under load and nothing else.
 */

const TARGET_FPS = 58;          // aim just under 60 so vsync jitter isn't "slow"
const FLOOR_FPS = 45;           // below this, give up resolution quickly
const SAMPLE_FRAMES = 45;       // ~0.75s of evidence before reacting
const SETTLE_MS = 900;          // minimum gap between changes, to avoid pumping

export function createAdaptiveResolution(renderer, { min = 0.5, max } = {}) {
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Coarse-pointer devices are phones and tablets: high pixel ratios on
    // modest GPUs, so they start conservatively and earn their way up.
    const isHandheld = window.matchMedia
        ? window.matchMedia('(pointer: coarse)').matches
        : false;
    const ceiling = max ?? Math.min(devicePixelRatio, isHandheld ? 1.5 : 2);
    const start = isHandheld ? Math.min(1, ceiling) : ceiling;

    let scale = start;
    let frames = 0;
    let elapsed = 0;
    let lastChangeAt = 0;

    renderer.setPixelRatio(scale);

    function apply(next) {
        const clamped = Math.max(min, Math.min(ceiling, Number(next.toFixed(2))));
        if (clamped === scale) return false;
        scale = clamped;
        renderer.setPixelRatio(scale);
        return true;
    }

    function update(delta, now) {
        frames += 1;
        elapsed += delta;
        if (frames < SAMPLE_FRAMES) return;

        const fps = frames / elapsed;
        frames = 0;
        elapsed = 0;

        if (now - lastChangeAt < SETTLE_MS) return;

        if (fps < FLOOR_FPS) {
            if (apply(scale - 0.25)) lastChangeAt = now;
        } else if (fps < TARGET_FPS) {
            if (apply(scale - 0.1)) lastChangeAt = now;
        } else if (fps > TARGET_FPS + 8 && scale < ceiling) {
            // Climb back slowly; overshooting means an immediate drop again.
            if (apply(scale + 0.1)) lastChangeAt = now;
        }
    }

    return {
        update,
        get scale() { return scale; },
        get ceiling() { return ceiling; }
    };
}
