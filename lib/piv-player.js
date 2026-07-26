/*
 * piv-player — wires a .piv file to a <canvas> and a set of transport controls.
 *
 * Expects markup shaped like the block build-showcase.js emits:
 *
 *   <div class="piv" data-piv-src="./assets/media/x.piv">
 *     <canvas data-piv-canvas></canvas>
 *     <p data-piv-status>…</p>
 *     <div data-piv-controls hidden>
 *       <button data-piv-toggle></button>
 *       <button data-piv-step="-1"></button>
 *       <button data-piv-step="1"></button>
 *       <input type="range" data-piv-scrub>
 *       <span data-piv-counter></span>
 *     </div>
 *   </div>
 *
 * Controls stay hidden until the file actually loads, so a parse failure leaves
 * the page with a plain message and the download link rather than dead buttons.
 */
(function () {
  "use strict";

  var Engine = window.PivEngine;

  function setStatus(root, message, isError) {
    var el = root.querySelector("[data-piv-status]");
    if (!el) return;
    el.textContent = message || "";
    el.hidden = !message;
    el.classList.toggle("is-error", !!isError);
  }

  function initPlayer(root) {
    var src = root.getAttribute("data-piv-src");
    var canvas = root.querySelector("[data-piv-canvas]");
    var controls = root.querySelector("[data-piv-controls]");
    if (!src || !canvas) return;

    var ctx = canvas.getContext("2d");
    var doc = null;
    var frame = 0;
    var playing = false;
    var rafId = 0;
    var lastTime = 0;
    var accumulator = 0;

    var toggleBtn = root.querySelector("[data-piv-toggle]");
    var scrub = root.querySelector("[data-piv-scrub]");
    var counter = root.querySelector("[data-piv-counter]");
    var stepBtns = root.querySelectorAll("[data-piv-step]");

    function render() {
      ctx.save();
      var ratio = canvas.width / doc.width;
      ctx.scale(ratio, ratio);
      Engine.drawFrame(ctx, doc, frame);
      ctx.restore();
      if (scrub) scrub.value = String(frame);
      if (counter) counter.textContent = frame + 1 + " / " + doc.frames.length;
      canvas.setAttribute(
        "aria-label",
        (root.getAttribute("data-piv-title") || "Pivot animation") +
          ", frame " + (frame + 1) + " of " + doc.frames.length
      );
    }

    function sizeCanvas() {
      // Draw at device resolution so thick strokes stay crisp when scaled up.
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var cssWidth = canvas.clientWidth || doc.width;
      var target = Math.max(doc.width, Math.round(cssWidth * dpr));
      if (canvas.width !== target) {
        canvas.width = target;
        canvas.height = Math.round((target * doc.height) / doc.width);
      }
    }

    function tick(now) {
      if (!playing) return;
      if (!lastTime) lastTime = now;
      // rAF stops while the tab is hidden; without a clamp the first frame back
      // would carry the whole gap and fast-forward the animation.
      accumulator += Math.min(now - lastTime, 250);
      lastTime = now;
      var interval = 1000 / doc.fps;
      var advanced = false;
      while (accumulator >= interval) {
        accumulator -= interval;
        frame = (frame + 1) % doc.frames.length;
        advanced = true;
      }
      if (advanced) render();
      rafId = window.requestAnimationFrame(tick);
    }

    function setPlaying(next) {
      playing = next;
      if (toggleBtn) {
        toggleBtn.textContent = playing ? "Pause" : "Play";
        toggleBtn.setAttribute("aria-pressed", playing ? "true" : "false");
      }
      window.cancelAnimationFrame(rafId);
      if (playing) {
        lastTime = 0;
        accumulator = 0;
        rafId = window.requestAnimationFrame(tick);
      }
    }

    function goTo(index) {
      var n = doc.frames.length;
      frame = ((index % n) + n) % n;
      render();
    }

    function wireControls() {
      if (toggleBtn) {
        toggleBtn.addEventListener("click", function () {
          setPlaying(!playing);
        });
      }
      Array.prototype.forEach.call(stepBtns, function (btn) {
        btn.addEventListener("click", function () {
          setPlaying(false);
          goTo(frame + Number(btn.getAttribute("data-piv-step")));
        });
      });
      if (scrub) {
        scrub.min = "0";
        scrub.max = String(doc.frames.length - 1);
        scrub.step = "1";
        scrub.addEventListener("input", function () {
          setPlaying(false);
          goTo(Number(scrub.value));
        });
      }
      // Shortcuts only where they don't fight the focused control: space would
      // re-trigger a focused button, and arrows already scrub a focused slider.
      root.addEventListener("keydown", function (event) {
        var target = event.target;
        if (event.key === " ") {
          if (target.closest("button")) return;
          event.preventDefault();
          setPlaying(!playing);
        } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          if (target.closest("input")) return;
          event.preventDefault();
          setPlaying(false);
          goTo(frame + (event.key === "ArrowRight" ? 1 : -1));
        }
      });
      window.addEventListener("resize", function () {
        sizeCanvas();
        render();
      });
    }

    setStatus(root, "Loading animation…");

    fetch(src)
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load the Pivot file (" + response.status + ")");
        return response.arrayBuffer();
      })
      .then(function (buffer) {
        return Engine.decodePiv(new Uint8Array(buffer));
      })
      .then(function (parsed) {
        doc = parsed;
        canvas.style.aspectRatio = doc.width + " / " + doc.height;
        sizeCanvas();
        wireControls();
        if (controls) controls.hidden = false;
        setStatus(root, "");
        render();
        var reduceMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setPlaying(!reduceMotion && doc.frames.length > 1);
      })
      .catch(function (error) {
        setStatus(root, error.message || "This Pivot animation could not be played.", true);
        canvas.hidden = true;
      });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-piv-src]"), initPlayer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
