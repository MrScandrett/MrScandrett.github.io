/*
 * touch-look — makes a PointerLockControls first-person game playable by touch.
 *
 * Pointer lock doesn't exist on phones and tablets, so these games were stuck on
 * their "Click to play" screen: the gate never opened, and every bit of game
 * logic guarded by `controls.isLocked` stayed switched off.
 *
 * On a coarse-pointer device this module:
 *   - turns the blocker into a tap-to-play gate that skips requestPointerLock,
 *   - sets controls.isLocked directly and fires the same 'lock'/'unlock' events
 *     the game already listens for, so no other game code has to change,
 *   - drags on the canvas to look around, using the same YXZ euler maths
 *     PointerLockControls applies to mouse movement,
 *   - treats a short tap as a left-click, so "click to interact" still works.
 *
 * On a mouse device it does nothing and normal pointer lock takes over.
 *
 * NOTE: this file is maintained in lib/touch-look.js and copied into each
 * project that needs it (horse-v1, thomas), because those projects load their
 * own src/ as ES modules and have to keep working standalone.
 */

const HALF_PI = Math.PI / 2;
const TAP_MOVE_LIMIT = 10; // px of drag still counted as a tap
const TAP_TIME_LIMIT = 300; // ms

export function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(pointer: coarse)").matches
    : false;
}

/**
 * @param {object} options
 * @param {object} options.controls   PointerLockControls instance
 * @param {object} options.camera     the camera it drives
 * @param {HTMLElement} options.domElement  canvas to drag on
 * @param {HTMLElement} [options.blocker]   overlay to dismiss on tap
 * @param {number} [options.sensitivity]    radians per pixel
 * @param {() => boolean} [options.canLook] return false to suspend looking
 *                                          (menus, inventory, name entry)
 */
export function enableTouchLook({
  controls,
  camera,
  domElement,
  blocker,
  sensitivity = 0.004,
  canLook = () => true,
}) {
  if (!isTouchDevice() || !controls || !camera || !domElement) return null;

  const euler = { x: 0, y: 0 };

  function readEuler() {
    // Same decomposition PointerLockControls uses internally.
    const q = camera.quaternion;
    const sinY = 2 * (q.w * q.y + q.x * q.z);
    const cosY = 1 - 2 * (q.y * q.y + q.x * q.x);
    euler.y = Math.atan2(sinY, cosY);
    const sinX = 2 * (q.w * q.x - q.z * q.y);
    euler.x = Math.asin(Math.max(-1, Math.min(1, sinX)));
  }

  function applyEuler() {
    euler.x = Math.max(-HALF_PI, Math.min(HALF_PI, euler.x));
    // YXZ order: yaw about world up, then pitch about the new right axis.
    const cy = Math.cos(euler.y / 2), sy = Math.sin(euler.y / 2);
    const cx = Math.cos(euler.x / 2), sx = Math.sin(euler.x / 2);
    camera.quaternion.set(sx * cy, sy * cx, -sx * sy, cx * cy);
  }

  function setLocked(locked) {
    controls.isLocked = locked;
    if (typeof controls.dispatchEvent === "function") {
      controls.dispatchEvent({ type: locked ? "lock" : "unlock" });
    }
  }

  // ── tap-to-play gate -----------------------------------------------------
  if (blocker) {
    blocker.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        setLocked(true);
      },
      true // capture, so the project's own controls.lock() handler never runs
    );
  }

  // ── drag to look ---------------------------------------------------------
  let activePointer = null;
  let lastX = 0, lastY = 0, startX = 0, startY = 0, startTime = 0;

  domElement.style.touchAction = "none";

  domElement.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || activePointer !== null) return;
    if (!controls.isLocked || !canLook()) return;
    activePointer = event.pointerId;
    lastX = startX = event.clientX;
    lastY = startY = event.clientY;
    startTime = performance.now();
    readEuler();
  });

  domElement.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointer) return;
    event.preventDefault();
    euler.y -= (event.clientX - lastX) * sensitivity;
    euler.x -= (event.clientY - lastY) * sensitivity;
    lastX = event.clientX;
    lastY = event.clientY;
    applyEuler();
  });

  function endPointer(event) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
    const elapsed = performance.now() - startTime;
    if (moved <= TAP_MOVE_LIMIT && elapsed <= TAP_TIME_LIMIT) {
      // A tap means "interact"/"shoot" — replay it as a left mouse click.
      for (const type of ["mousedown", "mouseup", "click"]) {
        domElement.dispatchEvent(
          new MouseEvent(type, {
            button: 0,
            buttons: type === "mousedown" ? 1 : 0,
            clientX: event.clientX,
            clientY: event.clientY,
            bubbles: true,
            cancelable: true,
          })
        );
      }
    }
  }

  domElement.addEventListener("pointerup", endPointer);
  domElement.addEventListener("pointercancel", (event) => {
    if (event.pointerId === activePointer) activePointer = null;
  });

  return { setLocked, isTouch: true };
}
