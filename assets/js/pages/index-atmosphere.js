/* Paint the galaxy and STEAM illustrations on demand. CSS transforms give
   each illustration its flight from the core without a drawing loop. */
(function () {
  "use strict";

  const stage = document.querySelector(".home-atmosphere");
  if (!stage) return;

  const backdrop = stage.querySelector(".home-atmosphere-art");
  const probe = stage.querySelector(".home-atmosphere-probe");
  const root = document.documentElement;
  const TAU = Math.PI * 2;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let preferStill = readStill();
  let onScreen = !window.IntersectionObserver;
  let pending = 0;
  let backdropDirty = true;
  let subjectsDirty = true;
  let palette;

  function readStill() {
    try { return localStorage.getItem("classroomos-reduced-motion") === "on"; }
    catch (_) { return false; }
  }

  function readPalette() {
    const colors = {};
    for (const name of ["s", "t", "e", "a", "m", "ink", "star", "shade"]) {
      probe.style.color = `var(--atmo-${name})`;
      colors[name] = getComputedStyle(probe).color;
    }
    return colors;
  }

  function dot(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }

  function glow(ctx, x, y, radius, hue, alpha) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, hue);
    gradient.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function drawBackdrop() {
    const width = backdrop.clientWidth;
    const height = backdrop.clientHeight;
    if (!width || !height) return;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5, 1050 / width, 360 / height);
    backdrop.width = Math.max(1, Math.round(width * scale));
    backdrop.height = Math.max(1, Math.round(height * scale));
    const ctx = backdrop.getContext("2d");
    if (!ctx) return;
    ctx.scale(backdrop.width / width, backdrop.height / height);

    // Stable points at different brightness levels leave a quiet space for the title.
    ctx.fillStyle = palette.star;
    for (let i = 1; i <= (width < 580 ? 85 : 190); i += 1) {
      const x = ((i * 0.61803398875) % 1) * width;
      const y = ((i * 0.41421356237) % 1) * height;
      const near = i % 13 === 0;
      const side = Math.abs(x / width - 0.5) > 0.23;
      ctx.globalAlpha = (near ? 0.64 : 0.14 + (i % 7) * 0.052) * (side ? 1 : 0.42);
      dot(ctx, x, y, near ? 1.45 : 0.44 + (i % 4) * 0.15);
    }

    drawGalaxy(ctx, width, height);
  }

  function drawGalaxy(ctx, width, height) {
    const radius = Math.min(width * 0.46, height * 0.94, 252);
    ctx.save();
    ctx.translate(width * 0.5, height * 0.52);
    ctx.rotate(-0.22);
    ctx.scale(1, 0.48);
    ctx.globalAlpha = 1;
    glow(ctx, 0, 0, radius * 0.88, palette.m, 0.29);
    glow(ctx, 0, 0, radius * 0.34, palette.s, 0.49);
    glow(ctx, 0, 0, radius * 0.17, palette.ink, 0.65);

    const colors = [palette.s, palette.m, palette.star];
    for (let arm = 0; arm < colors.length; arm += 1) {
      const offset = arm * TAU / colors.length;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, palette.ink);
      gradient.addColorStop(0.35, colors[arm]);
      gradient.addColorStop(1, "transparent");
      ctx.strokeStyle = gradient;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i <= 80; i += 1) {
        const progress = i / 80;
        const reach = radius * (0.055 + 0.945 * progress ** 1.55);
        const angle = offset + progress * TAU * 0.85;
        const x = Math.cos(angle) * reach;
        const y = Math.sin(angle) * reach;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = radius * 0.14;
      ctx.stroke();
      ctx.globalAlpha = 0.21;
      ctx.lineWidth = radius * 0.045;
      ctx.stroke();
      ctx.globalAlpha = 0.52;
      ctx.lineWidth = 1.25;
      ctx.stroke();

      for (let i = 1; i < 150; i += 1) {
        const progress = (i * 0.61803398875) % 1;
        const scatter = ((i * 0.41421356237) % 1) - 0.5;
        const reach = radius * (0.055 + 0.945 * progress ** 1.55 + scatter * progress * 0.22);
        const angle = offset + progress * TAU * 0.85 + scatter * 0.85;
        ctx.fillStyle = i % 5 === 0 ? palette.ink : colors[arm];
        ctx.globalAlpha = (1 - progress * 0.84) * (0.32 + (i % 7) * 0.095);
        dot(ctx, Math.cos(angle) * reach, Math.sin(angle) * reach, i % 9 === 0 ? 1.9 : 0.85);
      }
    }
    ctx.restore();
  }

  function planet(ctx, t, p) {
    const rings = (front) => {
      ctx.save();
      ctx.globalAlpha *= front ? 0.9 : 0.45;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 50, 12, -0.3, front ? 0 : Math.PI, front ? Math.PI : TAU);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 58, 14, -0.3, front ? 0 : Math.PI, front ? Math.PI : TAU);
      ctx.stroke();
      ctx.restore();
    };
    rings(false);
    const ball = ctx.createRadialGradient(-9, -10, 2, 0, 0, 30);
    ball.addColorStop(0, p.ink);
    ball.addColorStop(0.36, p.s);
    ball.addColorStop(0.82, p.shade);
    ball.addColorStop(1, p.m);
    ctx.fillStyle = ball;
    dot(ctx, 0, 0, 27);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, TAU);
    ctx.clip();
    ctx.globalAlpha *= 0.35;
    for (let i = 0; i < 6; i += 1) {
      const y = -22 + i * 9;
      const shift = ((t * 6 + i * 17) % 40) - 20;
      ctx.lineWidth = i % 2 ? 1 : 2.4;
      ctx.beginPath();
      ctx.moveTo(-40 + shift, y + 4);
      ctx.bezierCurveTo(-12 + shift, y + 7, 10 + shift, y - 2, 40 + shift, y - 5);
      ctx.stroke();
    }
    ctx.restore();
    rings(true);
  }

  function atom(ctx, t, p) {
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i += 1) {
      const rot = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 46, 15, rot, 0, TAU);
      ctx.stroke();
      const e = t * (1.8 + i * 0.35) + i * 2;
      const ex = Math.cos(e) * 46, ey = Math.sin(e) * 15;
      ctx.fillStyle = p.t;
      dot(ctx, ex * Math.cos(rot) - ey * Math.sin(rot), ex * Math.sin(rot) + ey * Math.cos(rot), 3.2);
    }
    ctx.fillStyle = p.ink;
    dot(ctx, 0, 0, 6);
    glow(ctx, 0, 0, 18, p.t, 0.7);
  }

  function gear(ctx, t, p) {
    const spin = t * 0.7;
    const teeth = 12, outer = 46, inner = 38;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < teeth * 4; i += 1) {
      const a = spin + (i / (teeth * 4)) * TAU;
      const r = (i % 4 === 1 || i % 4 === 2) ? outer : inner;
      if (i) ctx.lineTo(r * Math.cos(a), r * Math.sin(a)); else ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
    }
    ctx.closePath();
    const metal = ctx.createLinearGradient(-36, -40, 36, 40);
    metal.addColorStop(0, p.e);
    metal.addColorStop(0.48, p.shade);
    metal.addColorStop(1, p.e);
    ctx.fillStyle = metal;
    ctx.moveTo(10, 0);
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fill("evenodd");
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(29, 0);
    ctx.arc(0, 0, 29, 0, TAU);
    for (let i = 0; i < 5; i += 1) {
      const a = spin + (i * TAU) / 5;
      ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.lineTo(Math.cos(a) * 29, Math.sin(a) * 29);
    }
    ctx.stroke();
  }

  function nautilus(ctx, t, p) {
    const b = Math.log((1 + Math.sqrt(5)) / 2) / (Math.PI / 2);
    const end = 3.6 * Math.PI;
    const at = (a) => {
      const r = 1.4 * Math.exp(b * a);
      return [r * Math.cos(-a), r * Math.sin(-a)];
    };
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let a = 0; a <= end; a += 0.05) {
      const [x, y] = at(a);
      if (a) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
    // Chamber walls, the shell's growth record.
    ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    for (let a = Math.PI; a <= end; a += 0.55) {
      const [x0, y0] = at(a - 2 * Math.PI);
      const [x1, y1] = at(a);
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2 + y1 * 0.1, (y0 + y1) / 2 - x1 * 0.1, x1, y1);
    }
    ctx.stroke();
    ctx.fillStyle = p.m;
    ctx.font = "italic 600 16px Georgia, serif";
    ctx.fillText("φ", 26, -28);
  }

  function equation(ctx, t, p) {
    ctx.font = "italic 700 34px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    glow(ctx, 0, 0, 60, p.s, 0.35);
    ctx.lineWidth = 3;
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = p.shade;
    ctx.strokeText("E = mc²", 0, 0);
    ctx.globalAlpha /= 0.35;
    ctx.fillStyle = p.ink;
    ctx.fillText("E = mc²", 0, 0);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  function pythagoras(ctx, t, p) {
    // A 3-4-5 right triangle with the square on each side.
    const k = 8;
    const A = [-12, 14], B = [-12 + 4 * k, 14], C = [-12, 14 - 3 * k];
    const square = (P, Q, hue) => {
      const dx = Q[0] - P[0], dy = Q[1] - P[1];
      ctx.beginPath();
      ctx.moveTo(P[0], P[1]);
      ctx.lineTo(Q[0], Q[1]);
      ctx.lineTo(Q[0] + dy, Q[1] - dx);
      ctx.lineTo(P[0] + dy, P[1] - dx);
      ctx.closePath();
      ctx.save();
      ctx.globalAlpha *= 0.22;
      ctx.fillStyle = hue;
      ctx.fill();
      ctx.restore();
      ctx.stroke();
    };
    ctx.lineWidth = 1.6;
    square(B, A, p.s);   // below: 4²
    square(A, C, p.t);   // left: 3²
    square(C, B, p.m);   // hypotenuse: 5²
    ctx.fillStyle = p.ink;
    ctx.font = "italic 600 11px Georgia, serif";
    ctx.fillText("a² + b² = c²", -30, 52);
  }

  function palettePlate(ctx, t, p) {
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-46, 4);
    ctx.bezierCurveTo(-48, -30, 10, -40, 40, -22);
    ctx.bezierCurveTo(58, -10, 44, 8, 26, 6);
    ctx.bezierCurveTo(12, 5, 12, 22, 20, 28);
    ctx.bezierCurveTo(4, 42, -44, 36, -46, 4);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(6, 14, 7, 5, 0.3, 0, TAU);
    ctx.stroke();
    const blobs = [[-30, -6, p.a], [-14, -22, p.e], [8, -26, p.s], [28, -16, p.t], [-26, 18, p.m]];
    for (const [x, y, hue] of blobs) {
      ctx.fillStyle = hue;
      dot(ctx, x, y, 6 + Math.sin(t * 1.3 + x) * 0.8);
    }
    // The brush lying across it.
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, 40);
    ctx.lineTo(50, 4);
    ctx.stroke();
    ctx.fillStyle = p.a;
    dot(ctx, 52, 3, 3.5);
  }

  function chip(ctx, t, p) {
    ctx.lineWidth = 2;
    ctx.strokeRect(-26, -26, 52, 52);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const o = -18 + i * 9;
      ctx.moveTo(o, -26); ctx.lineTo(o, -34);
      ctx.moveTo(o, 26); ctx.lineTo(o, 34);
      ctx.moveTo(-26, o); ctx.lineTo(-34, o);
      ctx.moveTo(26, o); ctx.lineTo(34, o);
    }
    ctx.stroke();
    const beat = 0.5 + 0.5 * Math.sin(t * 3);
    glow(ctx, 0, 0, 30, p.t, 0.4 + beat * 0.4);
    ctx.fillStyle = p.ink;
    ctx.font = "700 14px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.floor(t * 2) % 2 ? "10" : "01", 0, 1);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  function notes(ctx, t, p) {
    ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.55;
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      ctx.moveTo(-50, -16 + i * 8);
      ctx.bezierCurveTo(-20, -24 + i * 8, 20, -8 + i * 8, 50, -16 + i * 8);
    }
    ctx.stroke();
    ctx.globalAlpha /= 0.55;
    ctx.fillStyle = p.ink;
    ctx.font = "52px 'Apple Symbols', 'Segoe UI Symbol', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♫", -12 + Math.sin(t) * 2, 2);
    ctx.font = "34px 'Apple Symbols', 'Segoe UI Symbol', serif";
    ctx.fillStyle = p.a;
    ctx.fillText("♪", 28, -10 + Math.cos(t * 1.2) * 3);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  const OBJECTS = [
    [planet, "s"], [gear, "e"], [equation, "s"], [palettePlate, "a"], [atom, "t"],
    [nautilus, "m"], [chip, "t"], [pythagoras, "m"], [notes, "a"]
  ];
  const HEADINGS = [
    [-0.97, 0.69], [0.97, -0.55], [-0.81, -0.8], [0.86, 0.92], [-0.92, 0.22],
    [0.93, -0.18], [-0.75, 0.91], [0.79, 0.58], [-0.96, -0.62]
  ];
  const day = Math.floor(Date.now() / 86400000);
  const subjects = OBJECTS.map((_, i) => {
    const canvas = document.createElement("canvas");
    const [x, y] = HEADINGS[i];
    canvas.className = "home-atmosphere-subject";
    canvas.width = canvas.height = 160;
    canvas.style.setProperty("--heading-x", x);
    canvas.style.setProperty("--heading-y", y);
    canvas.style.setProperty("--flight-delay", `-${(i * 4 + 7) % 36}s`);
    return canvas;
  });
  stage.append(...subjects);

  function drawSubject(canvas, draw, hue, time) {
    const size = canvas.width;
    canvas.width = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(size / 2, size / 2);
    ctx.scale(size / 153, size / 153);
    glow(ctx, 0, 0, 73, palette[hue], 0.37);
    ctx.strokeStyle = palette.ink;
    ctx.fillStyle = palette.ink;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    draw(ctx, time, palette);
  }

  function paint() {
    pending = 0;
    if (!onScreen || document.hidden || !stage.clientWidth) return;
    if (!palette) palette = readPalette();
    if (backdropDirty) {
      drawBackdrop();
      backdropDirty = false;
    }
    if (subjectsDirty) {
      subjects.forEach((canvas, i) => {
        const [draw, hue] = OBJECTS[(i + day) % OBJECTS.length];
        drawSubject(canvas, draw, hue, 1.8 + i * 0.4);
      });
      subjectsDirty = false;
    }
  }

  function update() {
    const visible = onScreen && !document.hidden;
    const still = preferStill || reducedMotion.matches || root.hasAttribute("data-classroom-presentation");
    stage.classList.toggle("is-drifting", visible && !still);
    if (visible && !pending && (backdropDirty || subjectsDirty)) pending = requestAnimationFrame(paint);
  }

  if (window.IntersectionObserver) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    }).observe(stage);
  }

  // Size the composition above the returning visitor's card when it is present.
  const bar = stage.parentElement;
  const memory = bar.querySelector("[data-memory-continue]");
  function resize() {
    const height = memory && !memory.hidden && memory.offsetParent === bar
      ? `${memory.offsetTop}px` : "";
    if (height !== stage.style.height) stage.style.height = height;
    backdropDirty = true;
    update();
  }

  if (window.ResizeObserver) new ResizeObserver(resize).observe(bar);
  else window.addEventListener("resize", resize);

  new MutationObserver(() => {
    palette = null;
    backdropDirty = subjectsDirty = true;
    update();
  }).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-lighting", "data-skin"] });
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ["data-classroom-presentation"] });
  document.addEventListener("visibilitychange", update);
  reducedMotion.addEventListener("change", update);
  window.addEventListener("classroomos:reducedmotionchange", (event) => {
    preferStill = Boolean(event.detail && event.detail.reducedMotion);
    update();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== "classroomos-reduced-motion" && event.key !== null) return;
    preferStill = readStill();
    update();
  });
  resize();
})();
