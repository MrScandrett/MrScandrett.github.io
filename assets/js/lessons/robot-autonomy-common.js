/* Shared helpers for the Robot Autonomy lessons: quiz buttons, canvas pointer
   mapping, and the small geometry used by every sim (rays vs. walls). */
(function (global) {
  'use strict';

  function initQuiz(root) {
    (root || document).querySelectorAll('.ra-question').forEach(function (question) {
      question.querySelectorAll('.ra-option').forEach(function (option) {
        option.addEventListener('click', function () {
          if (question.dataset.locked) return;
          question.dataset.locked = 'true';
          question.querySelectorAll('.ra-option').forEach(function (item) {
            item.disabled = true;
            if (item.dataset.choice === question.dataset.answer) item.classList.add('is-correct');
          });
          var correct = option.dataset.choice === question.dataset.answer;
          if (!correct) option.classList.add('is-wrong');
          question.querySelector('.ra-feedback').textContent = (correct ? 'Correct. ' : 'Not quite. ') + question.dataset.explanation;
        });
      });
    });
  }

  // Canvas drawn at a fixed logical size (its width/height attributes) and
  // scaled by CSS; convert a pointer event to logical coordinates.
  function canvasPoint(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height
    };
  }

  // Distance along a ray from (x, y) at angle a to the nearest axis-aligned
  // rectangle {x, y, w, h}, or maxRange if nothing is hit.
  function rayCast(x, y, a, rects, maxRange) {
    var dx = Math.cos(a), dy = Math.sin(a), best = maxRange;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var t1 = (r.x - x) / dx, t2 = (r.x + r.w - x) / dx;
      var t3 = (r.y - y) / dy, t4 = (r.y + r.h - y) / dy;
      var tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
      var tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
      if (tmax >= 0 && tmin <= tmax) {
        var t = tmin >= 0 ? tmin : tmax;
        if (t < best) best = t;
      }
    }
    return best;
  }

  function hitsRect(x, y, pad, rects) {
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad) return true;
    }
    return false;
  }

  // Gaussian noise (Box–Muller).
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function loop(fn) {
    if (global.SimKit && global.SimKit.loop) return global.SimKit.loop(function (dt) { fn(Math.min(0.05, dt)); });
    var last = 0, id = 0;
    function tick(t) { var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t; fn(dt); id = requestAnimationFrame(tick); }
    id = requestAnimationFrame(tick);
    return { stop: function () { cancelAnimationFrame(id); } };
  }

  global.RobotAutonomy = { initQuiz: initQuiz, canvasPoint: canvasPoint, rayCast: rayCast, hitsRect: hitsRect, gauss: gauss, loop: loop };
  document.addEventListener('DOMContentLoaded', function () { initQuiz(document); });
})(window);
