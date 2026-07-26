/*
 * touch-controls — on-screen gamepad for the keyboard-driven student games.
 *
 * The games already listen for keydown/keyup on window, document or body, so
 * rather than rewriting each one's input code we draw buttons and synthesize the
 * events they're waiting for. Each synthetic event carries `key`, `code` *and*
 * `keyCode`, because the projects are split between all three styles.
 *
 * Configuration comes from data/touch-controls.json, keyed by app slug, and is
 * inlined by build-showcase.js as window.__TOUCH_CONTROLS__:
 *
 *   {
 *     "landscape": true,              // hint to rotate on portrait phones
 *     "clusters": [
 *       { "side": "left",  "label": "P1",
 *         "pad": { "up": "KeyW", "down": "KeyS", "left": "KeyA", "right": "KeyD" } },
 *       { "side": "right", "label": "P2",
 *         "buttons": [ { "code": "Space", "label": "Jump", "hold": false } ] }
 *     ]
 *   }
 *
 * A cluster is a corner of the screen. Two-player games (frog-bog) put one
 * player in each corner; single-player games use a pad on the left and actions
 * on the right. Only the pad directions a game actually uses are rendered.
 *
 * Buttons default to hold-to-repeat semantics (keydown on press, keyup on
 * release), which is what a per-frame `keys[code]` game loop expects. Set
 * "hold": false for one-shot actions so a long press can't wedge the key down.
 *
 * The overlay only appears on coarse-pointer devices. Desktop gets a small
 * toggle instead, so the controls can be checked without a tablet to hand.
 */
(function () {
  "use strict";

  var config = window.__TOUCH_CONTROLS__;
  if (!config) return;

  // ── key descriptor -------------------------------------------------------
  var NAMED = {
    ArrowUp: ["ArrowUp", 38],
    ArrowDown: ["ArrowDown", 40],
    ArrowLeft: ["ArrowLeft", 37],
    ArrowRight: ["ArrowRight", 39],
    Space: [" ", 32],
    Enter: ["Enter", 13],
    Escape: ["Escape", 27],
    ShiftLeft: ["Shift", 16],
    ShiftRight: ["Shift", 16],
    Tab: ["Tab", 9],
    Backspace: ["Backspace", 8],
  };

  function describe(code) {
    if (NAMED[code]) return { code: code, key: NAMED[code][0], keyCode: NAMED[code][1] };
    if (/^Key[A-Z]$/.test(code)) {
      var letter = code.slice(3);
      return { code: code, key: letter.toLowerCase(), keyCode: letter.charCodeAt(0) };
    }
    if (/^Digit[0-9]$/.test(code)) {
      var digit = code.slice(5);
      return { code: code, key: digit, keyCode: digit.charCodeAt(0) };
    }
    return { code: code, key: code, keyCode: 0 };
  }

  // Dispatch from <body> so the event bubbles through body → document → window
  // and reaches whichever of the three the game happens to listen on.
  function send(type, descriptor) {
    var target = document.body || document.documentElement;
    var event = new KeyboardEvent(type, {
      key: descriptor.key,
      code: descriptor.code,
      bubbles: true,
      cancelable: true,
    });
    // keyCode/which aren't constructor options but plenty of the games read them.
    try {
      Object.defineProperty(event, "keyCode", { get: function () { return descriptor.keyCode; } });
      Object.defineProperty(event, "which", { get: function () { return descriptor.keyCode; } });
    } catch (e) { /* non-configurable in some engines; key/code still work */ }
    target.dispatchEvent(event);
  }

  // ── device class ---------------------------------------------------------
  function coarsePointer() {
    return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  }
  function deviceClass() {
    if (!coarsePointer()) return "desktop";
    var min = Math.min(window.innerWidth, window.innerHeight);
    return min >= 700 ? "tablet" : "phone";
  }

  // ── styles ---------------------------------------------------------------
  var CSS = [
    ".tc-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none;",
    "font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;",
    "padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right))",
    " max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));}",
    ".tc-root[hidden]{display:none}",
    ".tc-cluster{position:absolute;bottom:max(14px,env(safe-area-inset-bottom));",
    "display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}",
    ".tc-cluster.tc-left{left:max(14px,env(safe-area-inset-left))}",
    ".tc-cluster.tc-right{right:max(14px,env(safe-area-inset-right))}",
    ".tc-label{font:700 11px/1 system-ui,sans-serif;letter-spacing:.08em;color:#f8fafc;",
    "background:rgba(15,23,42,.6);border-radius:999px;padding:4px 10px;text-transform:uppercase}",
    ".tc-pad{display:grid;gap:8px;touch-action:none;",
    "grid-template-columns:repeat(3,var(--tc-size));grid-template-rows:repeat(2,var(--tc-size))}",
    ".tc-pad.tc-flat{grid-template-columns:repeat(2,var(--tc-size));grid-template-rows:var(--tc-size)}",
    ".tc-actions{display:flex;gap:8px;align-items:flex-end;touch-action:none}",
    ".tc-btn{pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;",
    "user-select:none;-webkit-user-select:none;appearance:none;",
    "display:flex;align-items:center;justify-content:center;",
    "width:var(--tc-size);height:var(--tc-size);border-radius:50%;",
    "background:rgba(15,23,42,.55);color:#f8fafc;",
    "border:2px solid rgba(248,250,252,.5);backdrop-filter:blur(4px);",
    "font-size:var(--tc-font);font-weight:700;line-height:1;padding:0;cursor:pointer}",
    ".tc-btn.tc-wide{width:auto;min-width:var(--tc-size);padding:0 16px;border-radius:999px}",
    ".tc-btn:active,.tc-btn.tc-on{background:rgba(56,189,248,.85);border-color:#f8fafc;transform:scale(.94)}",
    ".tc-toggle{position:absolute;top:max(10px,env(safe-area-inset-top));",
    "right:max(10px,env(safe-area-inset-right));pointer-events:auto;",
    "font:600 12px/1 system-ui,sans-serif;color:#f8fafc;background:rgba(15,23,42,.65);",
    "border:1px solid rgba(248,250,252,.4);border-radius:999px;padding:7px 11px;cursor:pointer}",
    ".tc-rotate{position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;",
    "align-items:center;justify-content:center;text-align:center;pointer-events:auto;",
    "background:rgba(2,6,23,.93);color:#e2e8f0;font-size:16px;padding:24px}",
    ".tc-rotate strong{font-size:19px}",
    ".tc-rotate button{margin-top:6px;font:600 14px/1 system-ui,sans-serif;color:#0f172a;",
    "background:#38bdf8;border:0;border-radius:999px;padding:11px 20px;cursor:pointer}",
    "@media (prefers-reduced-motion:reduce){.tc-btn:active,.tc-btn.tc-on{transform:none}}",
  ].join("");

  var SIZES = { phone: ["58px", "17px"], tablet: ["76px", "21px"], desktop: ["62px", "18px"] };

  // ── build ----------------------------------------------------------------
  var root, held = [];

  function releaseAll() {
    held.splice(0).forEach(function (entry) {
      entry.button.classList.remove("tc-on");
      send("keyup", entry.descriptor);
    });
  }

  function makeButton(code, label, opts) {
    var options = opts || {};
    var descriptor = describe(code);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "tc-btn" + (options.wide ? " tc-wide" : "");
    button.textContent = label;
    button.setAttribute("aria-label", options.ariaLabel || label);
    if (options.area) button.style.gridArea = options.area;

    var isDown = false;
    var hold = options.hold !== false;

    function press(event) {
      event.preventDefault();
      if (isDown) return;
      isDown = true;
      button.classList.add("tc-on");
      send("keydown", descriptor);
      if (hold) {
        held.push({ button: button, descriptor: descriptor });
      } else {
        // One-shot: release straight away so a long press can't stick.
        send("keyup", descriptor);
      }
    }

    function release(event) {
      if (event) event.preventDefault();
      if (!isDown) return;
      isDown = false;
      button.classList.remove("tc-on");
      if (hold) {
        for (var i = held.length - 1; i >= 0; i--) {
          if (held[i].button === button) held.splice(i, 1);
        }
        send("keyup", descriptor);
      }
    }

    button.addEventListener("pointerdown", function (event) {
      // Capture so a finger sliding off the button still delivers its keyup.
      if (button.setPointerCapture) {
        try { button.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
      }
      press(event);
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    // Several games fire on any window click (Luke D shoots that way), so a tap
    // on a control must not also read as a tap on the game.
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
    });
    return button;
  }

  function build() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    root = document.createElement("div");
    root.className = "tc-root";

    (config.clusters || []).forEach(function (spec) {
      root.appendChild(buildCluster(spec));
    });

    document.body.appendChild(root);
    applyDeviceClass();
  }

  // Grid areas are "row/column" within the pad's 3x2 (or 2x1) layout.
  var PAD_AREAS = { up: "1/2", left: "2/1", down: "2/2", right: "2/3" };
  var PAD_GLYPHS = { up: "▲", down: "▼", left: "◀", right: "▶" };
  var PAD_NAMES = { up: "Up", down: "Down", left: "Left", right: "Right" };

  function buildCluster(spec) {
    var cluster = document.createElement("div");
    cluster.className = "tc-cluster tc-" + (spec.side === "right" ? "right" : "left");

    if (spec.label) {
      var label = document.createElement("span");
      label.className = "tc-label";
      label.textContent = spec.label;
      cluster.appendChild(label);
    }

    if (spec.pad) {
      var directions = ["up", "left", "down", "right"].filter(function (d) {
        return spec.pad[d];
      });
      // Left/right only (runners, paddles) sit side by side rather than in a cross.
      var flat = directions.length === 2 && spec.pad.left && spec.pad.right;
      var pad = document.createElement("div");
      pad.className = "tc-pad" + (flat ? " tc-flat" : "");
      directions.forEach(function (direction) {
        var prefix = spec.label ? spec.label + " " : "";
        pad.appendChild(
          makeButton(spec.pad[direction], PAD_GLYPHS[direction], {
            area: flat ? null : PAD_AREAS[direction],
            ariaLabel: prefix + PAD_NAMES[direction],
          })
        );
      });
      cluster.appendChild(pad);
    }

    if (spec.buttons && spec.buttons.length) {
      var actions = document.createElement("div");
      actions.className = "tc-actions";
      spec.buttons.forEach(function (button) {
        actions.appendChild(
          makeButton(button.code, button.label, {
            hold: button.hold,
            wide: (button.label || "").length > 2,
            ariaLabel: (spec.label ? spec.label + " " : "") + (button.ariaLabel || button.label),
          })
        );
      });
      cluster.appendChild(actions);
    }
    return cluster;
  }

  function applyDeviceClass() {
    var kind = deviceClass();
    var size = SIZES[kind];
    root.style.setProperty("--tc-size", size[0]);
    root.style.setProperty("--tc-font", size[1]);
    if (kind === "desktop") {
      root.hidden = true;
      addDesktopToggle();
    } else {
      root.hidden = false;
    }
    maybeRotateHint(kind);
  }

  var toggle;
  function addDesktopToggle() {
    if (toggle) return;
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tc-toggle";
    toggle.textContent = "Touch controls";
    toggle.addEventListener("click", function () {
      root.hidden = !root.hidden;
      toggle.textContent = root.hidden ? "Touch controls" : "Hide controls";
      if (root.hidden) releaseAll();
    });
    // Lives outside .tc-root so hiding the pad doesn't hide its own switch.
    var host = document.createElement("div");
    host.className = "tc-root";
    host.style.pointerEvents = "none";
    host.appendChild(toggle);
    document.body.appendChild(host);
  }

  var rotateHint;
  function maybeRotateHint(kind) {
    if (!config.landscape || kind !== "phone") {
      if (rotateHint) rotateHint.remove(), (rotateHint = null);
      return;
    }
    var portrait = window.innerHeight > window.innerWidth;
    if (!portrait || rotateHint) {
      if (!portrait && rotateHint) rotateHint.remove(), (rotateHint = null);
      return;
    }
    rotateHint = document.createElement("div");
    rotateHint.className = "tc-rotate";
    rotateHint.innerHTML =
      "<strong>Turn your phone sideways</strong>" +
      "<span>This game is built wide, so it plays much better in landscape.</span>";
    var dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "Play anyway";
    dismiss.addEventListener("click", function () {
      config.landscape = false;
      rotateHint.remove();
      rotateHint = null;
    });
    rotateHint.appendChild(dismiss);
    root.appendChild(rotateHint);
  }

  window.addEventListener("resize", function () {
    if (root) applyDeviceClass();
  });
  window.addEventListener("orientationchange", function () {
    if (root) setTimeout(applyDeviceClass, 120);
  });
  // A backgrounded tab must not leave a key latched down.
  window.addEventListener("blur", releaseAll);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) releaseAll();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
