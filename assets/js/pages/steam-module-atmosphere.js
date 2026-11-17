(function () {
  "use strict";

  // Each plate is drawn once when the subject, size, or theme changes.
  // Coordinates use a shared 360 × 145 drawing area. CSS moves the bitmap.
  const subjects = {
    math: {
      lines: [
        "M22 117 H107 V51 Z M97 117 V107 H107",
        "M128 116 H225 M140 126 V52 M130 106 C151 109 158 76 178 74 S206 78 220 51",
        "M258 92 A41 41 0 1 1 340 92 A41 41 0 1 1 258 92 M299 44 V139 M251 92 H347",
        "M299 92 L329 64 M299 92 H317 A18 18 0 0 0 312 80"
      ],
      details: ["M22 106 V51 H107 M24 126 H108", "M154 99 V116 M177 75 V116 M200 74 V116", "M329 64 V92 M299 64 H329"],
      surfaces: ["M22 117 H107 V51 Z", "M154 99 C163 87 168 76 178 74 S193 75 200 73 V116 H154 Z", "M299 92 L329 64 A41 41 0 0 1 340 92 Z"],
      dots: [[329, 64, 2.4], [299, 92, 2]],
      labels: [["a² + b² = c²", 8, 33, 17], ["∫ₐᵇ f(x) dx", 139, 34, 19], ["θ", 320, 86, 12], ["a", 152, 128, 11], ["b", 198, 128, 11]]
    },
    physics: {
      lines: [
        "M20 79 H187 M42 35 V122 M20 79 Q41 31 62 79 T104 79 T146 79 T188 79",
        "M206 117 Q261 16 317 117 M206 117 H342 M233.5 79.1 L256 58.7 L244 62 M256 58.7 L251 69 M262 67 V96 L257 89 M262 96 L267 89"
      ],
      details: ["M20 94 Q41 57 62 94 T104 94 T146 94 T188 94", "M41 55 H125 M41 50 V60 M125 50 V60", "M233.5 79.1 V117 M261.5 66.5 V117 M289 79.1 V117 M301 102 H342"],
      surfaces: ["M20 79 Q41 31 62 79 T104 79 T146 79 T188 79 Z", "M206 117 Q261 16 317 117 Z"],
      dots: [[233.5, 79.1, 3.7], [261.5, 66.5, 2.6], [289, 79.1, 3.1]],
      labels: [["F = ma", 201, 33, 24], ["λ", 102, 106, 16], ["Eₖ = ½mv²", 224, 139, 18]]
    },
    space: {
      sky: true,
      planet: true,
      lines: [
        "M24 92 L59 65 L83 85 L115 61 L143 76 M83 85 L76 121",
        "M18 134 Q108 107 190 124 M35 13 Q71 23 107 17"
      ],
      dots: [[24, 92, 2.6], [59, 65, 4], [83, 85, 2], [115, 61, 3], [143, 76, 2], [76, 121, 2]]
    },
    chemistry: {
      details: ["M144 32 H152 V42 H144 Z M165 32 H173 V42 H165 Z M144 51 H152 V61 H144 Z M165 51 H173 V61 H165 Z M298 81 H316 V102 H298 Z"],
      surfaces: ["M44 63 L80 42 L116 63 V104 L80 125 L44 104 Z M285 39 H327 V80 H285 Z"],
      lines: [
        "M44 63 L80 42 L116 63 V104 L80 125 L44 104 Z M52 67 L79 51 M106 69 V98 M79 115 L53 100",
        "M222 80 L178 113 M222 80 L266 113 M285 39 H327 V80 H285 Z"
      ],
      dots: [[222, 80, 8], [178, 113, 5], [266, 113, 5]],
      labels: [["H₂O", 189, 49, 23], ["Na", 293, 68, 24]]
    },
    lifesci: {
      details: ["M174 106 C151 52 193 34 228 42 M250 78 L257 51 M217 100 L200 82 M278 66 L291 71"],
      surfaces: ["M201 112 C151 63 240 13 315 33 C319 88 253 137 201 112 Z"],
      lines: [
        "M48 20 C151 63 16 103 118 140 M118 20 C16 63 151 103 48 140",
        "M59 26 H106 M64 50 H103 M68 96 H98 M54 130 H111",
        "M201 112 C151 63 240 13 315 33 C319 88 253 137 201 112 Z M190 124 L296 48 M237 91 L229 62 M257 76 L281 85"
      ]
    },
    earth: {
      details: ["M27 85 Q96 68 168 75 T313 64 M4 136 Q95 151 154 126 T350 112 M139 46 Q163 28 184 29"],
      surfaces: ["M16 94 L104 34 L148 62 L207 25 L319 93 L359 98 V144 H16 Z"],
      lines: [
        "M0 124 Q84 143 150 112 T359 95 M0 112 Q75 131 149 99 T359 83 M0 98 Q73 121 149 88 T359 70",
        "M39 91 L104 34 L148 62 L207 25 L282 75 M89 48 L104 55 L116 43 M192 35 L206 46 L220 34",
        "M279 30 Q323 11 329 45 Q330 65 302 67"
      ],
      labels: [["↗", 315, 44, 14]]
    },
    engineering: {
      details: ["M32 71 H67 M54 60 V82 M61 65 V77 M205 117 H343 M221 117 V132 M327 116 V132"],
      surfaces: ["M222 111 L274 35 L327 111 Z"],
      lines: [
        "M25 43 H77 L83 33 L92 53 L101 33 L110 53 L119 43 H173 V99 H143 M113 99 H25 Z M114 85 V113 M141 85 V113",
        "M222 111 L274 35 L327 111 Z M249 111 L274 73 L300 111 M246 75 H302"
      ],
      dots: [[25, 43, 3], [173, 99, 3], [274, 35, 4]],
      labels: [["V = IR", 65, 78, 23]]
    },
    fabrication: {
      details: ["M24 131 H156 M24 126 V137 M156 126 V137 M197 102 L227 72 M288 118 L307 98"],
      surfaces: ["M213 36 H284 L319 68 V115 H213 Z"],
      lines: [
        "M25 120 H155 V45 H25 Z M45 45 V62 M66 45 V55 M87 45 V62 M108 45 V55 M129 45 V62",
        "M213 36 L284 36 L319 68 V115 H213 Z M284 36 V68 H319 M223 110 L306 69 M240 115 L319 77",
        "M213 24 H284 M213 19 V30 M284 19 V30"
      ],
      labels: [["mm", 74, 94, 21]]
    },
    "technical-elements": {
      details: ["M67 52 L43 115 M68 52 L93 115 M166 108 H344 M289 22 V108 M221 20 V111"],
      surfaces: ["M50 49 L23 122 H146 L79 49 Z"],
      lines: [
        "M42 25 H87 L80 49 H49 Z M50 49 L23 122 H146 L79 49",
        "M184 24 H333 M184 59 H333 M184 94 H333 M200 24 V118 M238 24 V118 M276 24 V118 M314 24 V118",
        "M192 41 H208 M230 80 H246 M268 63 H284 M306 100 H322"
      ],
      labels: [["dB", 99, 70, 20]]
    },
    design2d: {
      details: ["M22 22 H127 V128 H22 Z M193 107 H303 M283 95 L303 107 M155 125 H330"],
      surfaces: ["M32 32 H118 V118 H32 Z"],
      lines: [
        "M32 32 H118 V118 H32 Z M75 32 V118 M32 75 H118 M32 118 L118 32",
        "M164 107 C164 23 269 23 291 102 M164 107 V37 H221 M291 102 L317 102 M181 122 H337"
      ],
      dots: [[164, 107, 4], [164, 37, 4], [221, 37, 4], [291, 102, 4]]
    },
    design3d: {
      details: ["M22 116 L92 140 L185 100 M44 36 L129 85 L202 44 M112 24 L159 8 M186 71 L205 63"],
      surfaces: ["M43 64 L112 25 L181 64 L112 102 Z M112 102 L181 64 V111 L112 150 Z M219 75 L292 50 L337 75 L266 102 Z"],
      lines: [
        "M43 64 L112 25 L181 64 V111 L112 150 L43 111 Z M43 64 L112 102 L181 64 M112 102 V150 M112 25 V71 L43 111 M112 71 L181 111",
        "M219 109 L292 84 L337 109 L266 136 Z M219 92 L292 67 L337 92 L266 119 Z M219 75 L292 50 L337 75 L266 102 Z"
      ]
    },
    cs: {
      details: ["M170 113 H341 M178 121 H329 M230 35 V13 M285 52 L316 27 M326 112 L342 128"],
      surfaces: ["M183 101 L231 35 L285 52 L326 112 L252 112 Z"],
      lines: ["M183 101 L231 35 L285 52 L326 112 L252 112 Z M231 35 L252 112 L285 52 M183 101 L285 52"],
      dots: [[183, 101, 5], [231, 35, 6], [285, 52, 4], [326, 112, 6], [252, 112, 5]],
      labels: [["01 10 11", 34, 55, 23], ["if (x > 0)", 45, 99, 23]]
    },
    gamedev: {
      details: ["M23 96 H166 M45 73 V126 M91 73 V126 M139 73 V126 M204 42 H326 M220 127 H321"],
      surfaces: ["M23 120 H72 V96 H115 V72 H166 V120 Z M213 31 H310 V117 H213 Z"],
      lines: [
        "M23 120 H72 V96 H115 V72 H166 V120 H23 Z M62 111 Q83 36 130 58",
        "M213 31 H310 V117 H213 Z M229 53 H246 V70 H229 Z M276 76 H293 V93 H276 Z M247 87 H264 V104 H247 Z"
      ],
      dots: [[85, 68, 3], [104, 56, 3], [130, 58, 4]]
    },
    art: {
      details: ["M198 51 H341 M197 116 L265 51 L341 115 M222 133 L265 51 L318 132"],
      surfaces: ["M196 128 L265 51 L337 128 Z"],
      lines: [
        "M42 91 A42 42 0 1 1 126 91 A42 42 0 1 1 42 91 M90 91 A42 42 0 1 1 174 91 A42 42 0 1 1 90 91 M66 52 A42 42 0 1 1 150 52 A42 42 0 1 1 66 52",
        "M196 128 L265 51 L337 128 M193 51 H340 M265 51 V136 M226 96 H308"
      ],
      dots: [[265, 51, 4]]
    },
    music: {
      details: ["M91 34 V105 M146 34 V105 M211 34 V105 M233 82 H348 M243 110 H339"],
      surfaces: ["M244 83 Q256 32 268 83 T292 83 T316 83 T340 83 Z"],
      lines: [
        "M17 42 H213 M17 55 H213 M17 68 H213 M17 81 H213 M17 94 H213",
        "M244 83 Q256 32 268 83 T292 83 T316 83 T340 83"
      ],
      labels: [["♪", 50, 91, 38], ["♫", 107, 80, 33], ["♩", 168, 104, 33]]
    },
    language: {
      details: ["M36 25 H189 V128 H36 Z M53 114 H100 M211 107 H261 M279 121 H309"],
      surfaces: ["M37 31 H189 V122 H37 Z"],
      lines: ["M46 44 H180 M46 65 H143 M46 86 H167 M46 107 H126 M191 32 Q239 17 266 53 T332 76"],
      labels: [["Aa", 213, 98, 32], ["あ", 279, 111, 28], ["文", 168, 125, 26]]
    },
    systems: {
      details: ["M59 112 L22 135 M93 31 L74 12 M150 60 L179 33 M124 123 L151 141 M253 46 Q232 69 256 94 T284 119"],
      surfaces: ["M43 70 L93 31 L150 60 L124 123 L59 112 Z"],
      lines: [
        "M43 70 L93 31 L150 60 L124 123 L59 112 Z M43 70 L124 123 M93 31 L59 112 M150 60 L59 112",
        "M207 114 Q181 50 243 40 Q304 27 317 78 Q330 124 261 133 M207 114 L202 96 M207 114 L222 104"
      ],
      dots: [[43, 70, 5], [93, 31, 4], [150, 60, 6], [124, 123, 4], [59, 112, 4]]
    },
    bible: {
      details: ["M31 42 V118 Q93 105 155 128 Q216 106 276 118 V42 M155 120 V128 M312 66 Q324 60 326 43"],
      surfaces: ["M36 37 Q92 21 154 48 Q213 21 271 37 V111 Q213 94 154 120 Q94 94 36 111 Z"],
      lines: [
        "M36 37 Q92 21 154 48 Q213 21 271 37 V111 Q213 94 154 120 Q94 94 36 111 Z M154 48 V120",
        "M55 55 Q101 44 133 61 M55 69 Q101 58 133 75 M55 83 Q101 72 133 89 M175 61 Q215 43 251 55 M175 75 Q215 57 251 69 M175 89 Q215 71 251 83",
        "M296 99 Q325 100 335 127 M303 81 Q326 73 344 51"
      ]
    }
  };

  if (!window.IntersectionObserver || !window.ResizeObserver || !window.Path2D) return;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 0;
  canvas.className = "module-atmosphere-art";
  const stage = document.createElement("div");
  stage.className = "module-atmosphere";
  stage.setAttribute("aria-hidden", "true");
  stage.append(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  let banner = null;
  let plate = null;
  let onScreen = false;
  let paintFrame = 0;
  let preferStill = motionPreference();

  function motionPreference() {
    try { return localStorage.getItem("classroomos-reduced-motion") === "on"; }
    catch (_) { return false; }
  }

  function updateMotion() {
    stage.classList.toggle("is-drifting", onScreen && !document.hidden && !preferStill &&
      !reducedMotion.matches && !root.hasAttribute("data-classroom-presentation"));
  }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }

  function drawSky(accent, secondary) {
    for (let i = 0; i < 108; i += 1) {
      const x = (19 + i * 97) % 360;
      const y = (i % 3 === 0 ? 32 + x * 0.22 + (i * 29 % 31) : (7 + i * 53) % 145);
      const bright = i % 13 === 0;
      ctx.fillStyle = bright ? secondary : accent;
      ctx.globalAlpha = bright ? 0.86 : 0.13 + (i % 6) / 11;
      circle(x, y, bright ? 1.15 : 0.42 + (i % 4) * 0.17);
      ctx.fill();
      if (bright) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = secondary;
        ctx.beginPath();
        ctx.moveTo(x - 2.6, y);
        ctx.lineTo(x + 2.6, y);
        ctx.moveTo(x, y - 2.6);
        ctx.lineTo(x, y + 2.6);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawRings(color, front) {
    ctx.strokeStyle = color;
    const start = front ? 0 : Math.PI;
    const bands = [[66, 13, 2.9], [74, 15, 1.1], [81, 17, 4.1], [91, 20, 1.7], [97, 21, 0.7]];
    for (const [rx, ry, width] of bands) {
      ctx.globalAlpha = front ? 0.66 : 0.34;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.ellipse(259, 75, rx, ry, -0.37, start, start + Math.PI);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlanet(accent, secondary, shadow) {
    drawRings(secondary, false);
    const planet = ctx.createRadialGradient(236, 50, 2, 253, 69, 52);
    planet.addColorStop(0, secondary);
    planet.addColorStop(0.43, accent);
    planet.addColorStop(1, shadow);
    ctx.save();
    circle(259, 75, 43);
    ctx.clip();
    ctx.fillStyle = planet;
    ctx.fillRect(216, 32, 86, 86);
    ctx.lineCap = "butt";
    for (let i = 0; i < 10; i += 1) {
      const y = 47 + i * 6;
      ctx.strokeStyle = i % 3 === 0 ? secondary : shadow;
      ctx.globalAlpha = 0.14 + (i % 3) * 0.09;
      ctx.lineWidth = i % 2 === 0 ? 2.8 : 1;
      ctx.beginPath();
      ctx.moveTo(208, y + 11);
      ctx.bezierCurveTo(237, y + 19, 282, y + 5, 308, y - 11);
      ctx.stroke();
    }
    ctx.restore();
    drawRings(secondary, true);

    const moon = ctx.createRadialGradient(316, 29, 0, 321, 34, 10);
    moon.addColorStop(0, secondary);
    moon.addColorStop(1, shadow);
    ctx.fillStyle = moon;
    circle(321, 34, 8);
    ctx.fill();
    ctx.fillStyle = shadow;
    ctx.globalAlpha = 0.35;
    circle(318, 32, 1.8);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawDetails(accent, secondary) {
    const wash = ctx.createLinearGradient(20, 20, 340, 139);
    wash.addColorStop(0, accent);
    wash.addColorStop(1, secondary);
    ctx.fillStyle = wash;
    ctx.globalAlpha = 0.18;
    for (const surface of plate.surfaces || []) ctx.fill(new Path2D(surface));

    ctx.globalAlpha = 0.46;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 0.75;
    ctx.setLineDash([2, 3]);
    for (const marks of plate.details || []) ctx.stroke(new Path2D(marks));
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  function draw() {
    paintFrame = 0;
    if (!banner || !onScreen || document.hidden) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;

    // One small surface even on a large or high-DPI screen.
    const scale = Math.min(window.devicePixelRatio || 1, 1.5, 660 / width, 220 / height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const artScale = Math.min(canvas.width / 360, canvas.height / 145);
    ctx.setTransform(artScale, 0, 0, artScale, (canvas.width - 360 * artScale) / 2, (canvas.height - 145 * artScale) / 2);

    const style = getComputedStyle(stage);
    const accent = style.getPropertyValue("--subject-line").trim();
    const secondary = style.getPropertyValue("--subject-mark").trim();
    ctx.lineWidth = 1.35;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (plate.sky) drawSky(accent, secondary);
    if (plate.planet) drawPlanet(accent, secondary, style.getPropertyValue("--subject-planet-shadow").trim());
    drawDetails(accent, secondary);

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = accent;
    for (const line of plate.lines) ctx.stroke(new Path2D(line));
    ctx.fillStyle = secondary;
    for (const [x, y, radius] of plate.dots || []) {
      ctx.globalAlpha = 0.25;
      circle(x, y, radius * 1.85);
      ctx.fill();
      ctx.globalAlpha = 1;
      circle(x, y, radius);
      ctx.fill();
    }
    for (const [label, x, y, size] of plate.labels || []) {
      ctx.font = `500 ${size}px ui-monospace, monospace`;
      ctx.fillText(label, x, y);
    }
  }

  function schedulePaint() {
    if (banner && onScreen && !document.hidden && !paintFrame) paintFrame = requestAnimationFrame(draw);
  }

  const visibility = new IntersectionObserver(function (entries) {
    const entry = entries.find((item) => item.target === stage);
    if (!entry) return;
    onScreen = entry.isIntersecting;
    updateMotion();
    schedulePaint();
  });
  const size = new ResizeObserver(schedulePaint);

  function showSubject(section) {
    const next = section && section.querySelector(".module-banner");
    if (next === banner) return;
    visibility.disconnect();
    size.disconnect();
    stage.remove();
    banner = next;
    onScreen = false;
    updateMotion();
    canvas.width = canvas.height = 0;
    if (!banner) return;
    const subject = section.id.slice("module-".length);
    plate = subjects[subject];
    if (!plate) return;
    stage.dataset.subject = subject;
    banner.prepend(stage);
    size.observe(stage);
    visibility.observe(stage);
  }

  window.addEventListener("catalogsubjectchange", (event) => showSubject(event.detail.section));
  showSubject(document.querySelector(".catalog-active-module"));
  new MutationObserver(function () {
    schedulePaint();
    updateMotion();
  }).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-lighting", "data-classroom-presentation"] });
  document.addEventListener("visibilitychange", function () {
    updateMotion();
    schedulePaint();
  });
  reducedMotion.addEventListener("change", updateMotion);
  window.addEventListener("classroomos:reducedmotionchange", function (event) {
    preferStill = event.detail.reducedMotion;
    updateMotion();
  });
  window.addEventListener("storage", function (event) {
    if (event.key !== "classroomos-reduced-motion" && event.key !== null) return;
    preferStill = motionPreference();
    updateMotion();
  });
})();
