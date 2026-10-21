// sphere-theme.mjs — what the 360° page sphere's surroundings look like for each site theme.
// Pure functions (no DOM, no Three.js) so tests/sphere-theme.test.mjs can check every theme
// in the registry. sphere-environment.mjs turns this into a shader.
//
// Looks: sky (light themes), night (stars), bark (wood grain), vaporwave (neon grid + sun),
// mandelbrot (revolving fractal), lava (wax from LiquidEngine.ThermalBlobs, in 360°).

export const LOOK = { sky: 0, night: 1, bark: 2, vaporwave: 3, mandelbrot: 4, lava: 5 };
const BY_THEME = { night: LOOK.night, bark: LOOK.bark, vaporwave: LOOK.vaporwave, mandelbrot: LOOK.mandelbrot, lavalamp: LOOK.lava };

export function hexToRgb(hex) {
  const v = parseInt(String(hex).replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
const luminance = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);

/** Look and colours for a registry theme ({ id, tone, swatch, accentRGB, mandelSwatch }). */
export function environmentFor(theme) {
  const swatch = (theme.swatch || []).map(hexToRgb);
  const accent = (theme.accentRGB || [0, 113, 227]).map(v => v / 255);
  const byLight = swatch.slice().sort((a, b) => luminance(a) - luminance(b));
  const dark = byLight[0] || [0.02, 0.02, 0.05];
  const light = byLight[byLight.length - 1] || accent;
  const secondary = swatch[swatch.length - 1] || accent;
  const look = BY_THEME[theme.id] ?? LOOK.sky;

  let palette;
  if (look === LOOK.mandelbrot) {
    const m = (theme.mandelSwatch || []).map(hexToRgb);
    while (m.length < 4) m.push(m[m.length - 1] || accent);
    palette = m.slice(0, 4);
  } else if (look === LOOK.lava) {
    palette = [dark, swatch[1] || accent, swatch[2] || secondary, accent]; // base, wax A, wax B, glow
  } else if (look === LOOK.vaporwave) {
    palette = [dark, accent, secondary, mix(accent, secondary, 0.5)];
  } else if (look === LOOK.sky) {
    palette = [light, accent, mix(light, accent, 0.5), dark];
  } else {
    palette = [dark, mix(dark, accent, 0.3), accent, light];
  }
  return { id: theme.id, look, tone: theme.tone || 'light', palette, accent, secondary, dark, light };
}

/* ── Lava lamp: ThermalBlobs lives in a flat box (pixels, y down); wrap it round you ── */
export const LAVA_BOX = { width: 1600, height: 900 };
const LAT_TOP = (70 * Math.PI) / 180;
const LAT_BOTTOM = (-62 * Math.PI) / 180; // the heater ring glows below your feet

/** A ThermalBlobs body → a unit direction and an angular radius on the sphere. */
export function blobToSphere(body, box = LAVA_BOX) {
  const lon = (body.x / box.width) * 2 * Math.PI - Math.PI;
  const lat = LAT_TOP - (body.y / box.height) * (LAT_TOP - LAT_BOTTOM);
  const c = Math.cos(lat);
  return { dir: [c * Math.sin(lon), Math.sin(lat), -c * Math.cos(lon)], radius: body.r * ((2 * Math.PI) / box.width) };
}

/* ── Motion comfort: a world that moves all around you is the classic cause of VR queasiness ── */
export const MOTION_MODES = ['auto', 'calm', 'still', 'full'];
export const CALM = 0.35;

/** 1 = full speed, 0 = frozen. Auto is still when the visitor asked for reduced motion,
 *  calm inside a headset session, and full on a flat screen. */
export function motionScale(mode, { presenting = false, reduced = false } = {}) {
  switch (mode) {
    case 'calm': return CALM;
    case 'still': return 0;
    case 'full': return 1;
    default: return reduced ? 0 : presenting ? CALM : 1;
  }
}
