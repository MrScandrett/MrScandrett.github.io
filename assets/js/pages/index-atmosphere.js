/* Homepage hero: an ambient "void" behind the launch bar, in the spirit of old
   practical-effects TV openings. STEAM objects (a ringed planet, an atom, a gear,
   a nautilus, a floating equation…) tumble slowly out of a starfield toward the
   viewer, past a turning spiral, under film grain, flicker and a vignette.

   Cheap by design: one small canvas (≤1000 px wide, ≤1.5× DPR), ~30 fps, and the
   loop stops whenever the hero is off screen, the tab is hidden, the class is in
   presentation mode, or the visitor prefers reduced motion (then one still frame
   is drawn, different each day). */
(function () {
  "use strict";

  const bar = document.querySelector(".home-launch-bar");
  if (!bar || !window.IntersectionObserver || !window.ResizeObserver) return;

  const H = 200;           // drawing height; the width follows the panel's shape
  let W = 520;
  let VX = 260;            // vanishing point: centred, a little above the middle
  const VY = 82;
  const TAU = Math.PI * 2;
  const FRAME_MS = 1000 / 30;
  const LAUNCH_EVERY = 3.2; // seconds between objects
  const LIFETIME = 12.5;    // seconds an object takes to drift past

  const stage = document.createElement("div");
  stage.className = "home-atmosphere";
  stage.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  canvas.className = "home-atmosphere-art";
  canvas.width = canvas.height = 0;
  const probe = document.createElement("span");
  probe.className = "home-atmosphere-probe";
  stage.append(canvas, probe);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  bar.prepend(stage);

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let preferStill = readStill();
  let onScreen = false;
  let raf = 0;
  let last = 0;
  let clock = 0;          // seconds of animation actually shown (paused time is skipped)
  let palette = null;     // resolved colours; refreshed on theme change
  let grain = null;
  const today = Math.floor(Date.now() / 86400000);

  function readStill() {
    try { return localStorage.getItem("classroomos-reduced-motion") === "on"; }
    catch (_) { return false; }
  }

  function still() {
    return preferStill || reducedMotion.matches || root.hasAttribute("data-classroom-presentation");
  }

  // Custom properties may hold color-mix(); let the browser resolve them to rgb().
  function color(name) {
    probe.style.color = `var(${name})`;
    return getComputedStyle(probe).color;
  }

  function readPalette() {
    palette = {
      s: color("--steam-s"), t: color("--steam-t"), e: color("--steam-e"),
      a: color("--steam-a"), m: color("--steam-m"),
      ink: color("--atmo-ink"), star: color("--atmo-star"),
      shade: color("--atmo-shade"), void: color("--atmo-void")
    };
  }

  // A tile of film grain, made once and slid around every frame.
  function makeGrain() {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 128;
    const g = tile.getContext("2d");
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.random() * 90;
    }
    g.putImageData(img, 0, 0);
    return ctx.createPattern(tile, "repeat");
  }

  function dot(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  function glow(x, y, r, hue, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hue);
    g.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  /* ---------- The void: streaming stars and a slowly turning spiral. ---------- */

  function stars(t) {
    const p = palette;
    for (let i = 0; i < 190; i += 1) {
      const a = i * 2.39996;                          // golden angle spreads them evenly
      const speed = 0.018 + (i % 7) * 0.006;
      const f = (t * speed + (i * 0.618) % 1) % 1;
      const r = 8 + f * f * W * 0.62;
      const x = VX + Math.cos(a) * r;
      const y = VY + Math.sin(a) * r * 0.62;
      if (x < -5 || x > W + 5 || y < -5 || y > H + 5) continue;
      const twinkle = 0.6 + 0.4 * Math.sin(t * (1 + (i % 5) * 0.4) + i);
      ctx.globalAlpha = Math.min(1, f * 3) * twinkle * (i % 11 === 0 ? 0.95 : 0.5);
      ctx.fillStyle = i % 11 === 0 ? p.ink : p.star;
      dot(x, y, (i % 11 === 0 ? 1.1 : 0.45) + f * 1.1);
    }
    ctx.globalAlpha = 1;
  }

  function vortex(t) {
    const p = palette;
    const b = 0.21;
    ctx.save();
    ctx.translate(VX, VY);
    ctx.scale(1, 0.62);
    ctx.rotate(-t * 0.12);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 1.1;
    for (let arm = 0; arm < 6; arm += 1) {
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      for (let a = 0; a < 4.6 * Math.PI; a += 0.08) {
        const r = 3 * Math.exp(b * a);
        const x = r * Math.cos(a + (arm * TAU) / 6);
        const y = r * Math.sin(a + (arm * TAU) / 6);
        if (a) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    glow(VX, VY, 70, p.m, 0.35);
  }

  /* ---------- The floating objects. Each draws around (0, 0) within ~50 units. ---------- */

  function planet(t, p) {
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
    ball.addColorStop(0.45, p.s);
    ball.addColorStop(1, p.shade);
    ctx.fillStyle = ball;
    dot(0, 0, 27);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, TAU);
    ctx.clip();
    ctx.globalAlpha *= 0.25;
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

  function atom(t, p) {
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i += 1) {
      const rot = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 46, 15, rot, 0, TAU);
      ctx.stroke();
      const e = t * (1.8 + i * 0.35) + i * 2;
      const ex = Math.cos(e) * 46, ey = Math.sin(e) * 15;
      ctx.fillStyle = p.t;
      dot(ex * Math.cos(rot) - ey * Math.sin(rot), ex * Math.sin(rot) + ey * Math.cos(rot), 3.2);
    }
    ctx.fillStyle = p.ink;
    dot(0, 0, 6);
    glow(0, 0, 18, p.t, 0.7);
  }

  function gear(t) {
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
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.moveTo(29, 0);
    ctx.arc(0, 0, 29, 0, TAU);
    for (let i = 0; i < 5; i += 1) {
      const a = spin + (i * TAU) / 5;
      ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.lineTo(Math.cos(a) * 29, Math.sin(a) * 29);
    }
    ctx.stroke();
  }

  function nautilus(t, p) {
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

  function equation(t, p) {
    ctx.font = "italic 700 34px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    glow(0, 0, 60, p.s, 0.35);
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

  function pythagoras(t, p) {
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

  function palettePlate(t, p) {
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
      dot(x, y, 6 + Math.sin(t * 1.3 + x) * 0.8);
    }
    // The brush lying across it.
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, 40);
    ctx.lineTo(50, 4);
    ctx.stroke();
    ctx.fillStyle = p.a;
    dot(52, 3, 3.5);
  }

  function chip(t, p) {
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
    glow(0, 0, 30, p.t, 0.4 + beat * 0.4);
    ctx.fillStyle = p.ink;
    ctx.font = "700 14px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.floor(t * 2) % 2 ? "10" : "01", 0, 1);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  function notes(t, p) {
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

  // Where each launch heads: alternately left and right, mirrored, so the
  // drift stays balanced around the centred title.
  const HEADINGS = [-0.3, Math.PI + 0.3, 0.55, Math.PI - 0.55, -0.85, Math.PI + 0.85, 0.15, Math.PI - 0.15];

  function flights(t) {
    const p = palette;
    const list = [];
    const newest = Math.floor(t / LAUNCH_EVERY);
    for (let n = newest; n > newest - Math.ceil(LIFETIME / LAUNCH_EVERY) - 1; n -= 1) {
      const age = t - n * LAUNCH_EVERY;
      if (age < 0 || age > LIFETIME) continue;
      list.push({ n, z: age / LIFETIME });
    }
    list.sort((a, b) => a.z - b.z); // far ones first
    for (const { n, z } of list) {
      const k = ((n + today) % OBJECTS.length + OBJECTS.length) % OBJECTS.length;
      const [draw, hueKey] = OBJECTS[k];
      const heading = HEADINGS[((n % HEADINGS.length) + HEADINGS.length) % HEADINGS.length];
      // Ease toward the camera: slow far away, quicker as it nears.
      const travel = z * z;
      const dist = travel * W * 0.52;
      const x = VX + Math.cos(heading) * dist;
      const y = VY + Math.sin(heading) * dist * 0.55 + Math.sin(z * 5 + n) * 6;
      const scale = 0.16 + travel * 1.7;
      const alpha = Math.min(1, z / 0.18) * Math.min(1, (1 - z) / 0.22);
      const tumble = Math.cos(t * 0.55 + n * 1.7);              // turning about its vertical axis
      const roll = Math.sin(t * 0.33 + n) * 0.45 + n * 0.8;
      const local = t + n * 3;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(roll);
      ctx.scale(scale * (0.25 + 0.75 * Math.abs(tumble)), scale);
      glow(0, 0, 70, p[hueKey], 0.28);
      ctx.strokeStyle = p.ink;
      ctx.fillStyle = p.ink;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      draw(local, p);
      ctx.restore();
    }
  }

  /* ---------- Film: vignette, flicker, grain, the odd scratch. ---------- */

  function film(t, cw, ch) {
    const p = palette;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const v = ctx.createRadialGradient(cw * 0.5, ch * 0.42, Math.min(cw, ch) * 0.25, cw * 0.5, ch * 0.42, Math.max(cw, ch) * 0.62);
    v.addColorStop(0, "transparent");
    v.addColorStop(1, p.void);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, cw, ch);
    // Gentle flicker: a faint veil that breathes a little each frame.
    ctx.globalAlpha = 0.03 + Math.abs(Math.sin(t * 13.7) * Math.sin(t * 4.1)) * 0.05;
    ctx.fillStyle = p.void;
    ctx.fillRect(0, 0, cw, ch);
    if (!grain) grain = makeGrain();
    if (grain) {
      if (grain.setTransform && window.DOMMatrix) {
        grain.setTransform(new DOMMatrix().translate((t * 977) % 128, (t * 613) % 128));
      }
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, cw, ch);
    }
    // A scratch on the film now and then.
    const s = Math.sin(Math.floor(t * 6) * 91.7) * 43758.5;
    if (s - Math.floor(s) > 0.93) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = p.ink;
      ctx.fillRect((s * 7 % 1) * cw, 0, 1, ch);
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5, 1000 / width, 380 / height);
    const cw = Math.max(1, Math.round(width * scale));
    const ch = Math.max(1, Math.round(height * scale));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    if (!palette) readPalette();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    // Fit by height and stretch the drawing to the panel's width, so the void is
    // centred whatever the shape; the camera sways like it is hung on a wire.
    const art = ch / H;
    W = cw / art;
    VX = W / 2;
    ctx.setTransform(art, 0, 0, art, Math.sin(t * 0.21) * 4 * art, Math.sin(t * 0.17) * 3 * art);
    vortex(t);
    stars(t);
    flights(t);
    film(t, cw, ch);
  }

  function running() {
    return onScreen && !document.hidden && !still();
  }

  function tick(now) {
    raf = 0;
    if (!running()) return;
    raf = requestAnimationFrame(tick);
    if (last && now - last < FRAME_MS) return;
    // Skip time spent paused so the flight resumes where it left off.
    clock += last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    frame(clock);
  }

  function update() {
    stage.classList.toggle("is-drifting", running());
    if (running()) {
      if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
      return;
    }
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    // A still frame with a few objects in mid-flight.
    if (onScreen && !document.hidden) requestAnimationFrame(() => frame(still() ? LIFETIME + 3.1 : clock));
  }

  // Start a little way in, so objects are already floating on first paint.
  clock = LIFETIME;

  new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    update();
  }, { rootMargin: "200px 0px" }).observe(stage);
  // The void fills the band above the "welcome back" card (or the whole bar).
  const brand = bar.querySelector(".home-launch-brand");
  function fitStage() {
    const memory = bar.querySelector("[data-memory-continue]:not([hidden])");
    if (brand && memory && memory.offsetParent === bar) {
      stage.style.height = `${Math.round(memory.offsetTop + 12)}px`;
    } else {
      stage.style.removeProperty("height");
    }
    if (!raf) update();
  }
  new ResizeObserver(fitStage).observe(bar);
  new ResizeObserver(() => { if (!raf) update(); }).observe(stage);
  new MutationObserver(() => { palette = null; update(); })
    .observe(root, { attributes: true, attributeFilter: ["data-theme", "data-lighting", "data-skin", "data-classroom-presentation"] });
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
})();
