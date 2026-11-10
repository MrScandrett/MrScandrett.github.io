/* PbdCore: the Pale Blue Dot lesson's DOM-free maths (lessons/cosmology/pale-blue-dot.html): the log zoom scale,
 * distance and light-time wording, planet positions from mean orbital elements, sky → orbital-plane projection,
 * the heliosphere outline and the scale bar. Moved unchanged out of the page's inline <script>;
 * pale-blue-dot.js needs this file first. Tested in tests/pale-blue-dot-core.test.mjs. */
  var PbdCore = (function () {
    // ── Scale map: slider 0→100 maps logarithmically to the width of the view ──
    // 0   = 1.5 m    (a desk)
    // 100 = 2.2e27 m (wide enough to show the whole observable universe,
    //       8.8e26 m across, inside the canvas height)
    // Everything else below (stages, labels, speech, journey) is keyed to the
    // real width in meters, never to raw slider positions.
    const LOG_MIN = Math.log10(1.5);

    const LOG_MAX = Math.log10(2.2e27);

    function sliderToMeters(s) {
      return Math.pow(10, LOG_MIN + (s / 100) * (LOG_MAX - LOG_MIN));
    }

    function metersToSlider(m) {
      return Math.max(0, Math.min(100, (Math.log10(m) - LOG_MIN) / (LOG_MAX - LOG_MIN) * 100));
    }

    const KM = 1e3;

    const AU = 1.496e11;

    const LY = 9.461e15;

    const C_MS = 2.998e8;

    const D2R = Math.PI / 180;

    function sig(x) {
      if (x >= 100) return Math.round(x).toLocaleString();
      if (x >= 10) return x.toFixed(1);
      return x.toFixed(2);
    }

    function formatDistance(m) {
      if (m >= LY * 1e9)  return sig(m / (LY * 1e9)) + ' billion light-years';
      if (m >= LY * 1e6)  return sig(m / (LY * 1e6)) + ' million light-years';
      if (m >= LY * 1e3)  return sig(m / (LY * 1e3)) + ' thousand light-years';
      if (m >= LY * 0.25) return sig(m / LY) + ' light-years';
      if (m >= AU * 0.5)  return sig(m / AU) + ' AU';
      if (m >= KM * 1e6)  return sig(m / (KM * 1e6)) + ' million km';
      if (m >= KM)        return sig(m / KM) + ' km';
      return sig(m) + ' m';
    }

    function formatLightTime(m) {
      const s = m / C_MS;
      if (s < 1e-3) return Math.max(1, Math.round(s * 1e9)).toLocaleString() + ' nanoseconds';
      if (s < 1) return sig(s * 1e3) + ' milliseconds';
      if (s < 120) return sig(s) + ' seconds';
      if (s < 7200) return sig(s / 60) + ' minutes';
      if (s < 2 * 86400) return sig(s / 3600) + ' hours';
      if (s < 3.156e7 * 2) return sig(s / 86400) + ' days';
      const y = s / 3.156e7;
      if (y >= 1e9) return sig(y / 1e9) + ' billion years';
      if (y >= 1e6) return sig(y / 1e6) + ' million years';
      return sig(y) + ' years';
    }

    const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

    function powerOfTen(m) {
      return '10' + String(Math.round(Math.log10(m))).split('').map(c => SUP[c]).join('') + ' m';
    }

    function fade(v, a, b) { // 0 at a, 1 at b, log-spaced; works with a > b to fade out
      const t = (Math.log10(v) - Math.log10(a)) / (Math.log10(b) - Math.log10(a));
      return Math.max(0, Math.min(1, t));
    }

    // ── The solar system, in today's real positions ──
    // Mean orbital elements (J2000 plus rates per century, Standish 1992),
    // projected onto the plane of Earth's orbit. Good to a fraction of a degree.
    const EARTH_R = 6.371e6;

    const MOON_R  = 1.737e6;

    const SUN_R   = 6.957e8;

    const PLANETS = [
      { name: 'Mercury', a: 0.38710,  e: 0.20563, L: 252.2503, dL: 149472.6741, w: 77.4578,  r: 2.4397e6, color: '#b5aca2' },
      { name: 'Venus',   a: 0.72333,  e: 0.00678, L: 181.9791, dL: 58517.8154,  w: 131.6025, r: 6.0518e6, color: '#e8b067' },
      { name: 'Earth',   a: 1.00000,  e: 0.01671, L: 100.4645, dL: 35999.3724,  w: 102.9377, r: EARTH_R,  color: '#3a7bd5' },
      { name: 'Mars',    a: 1.52371,  e: 0.09339, L: -4.5534,  dL: 19140.3027,  w: -23.9436, r: 3.3895e6, color: '#d45030' },
      { name: 'Jupiter', a: 5.20289,  e: 0.04839, L: 34.3964,  dL: 3034.7461,   w: 14.7285,  r: 6.9911e7, color: '#c89060' },
      { name: 'Saturn',  a: 9.53668,  e: 0.05386, L: 49.9540,  dL: 1222.4936,   w: 92.5989,  r: 5.8232e7, color: '#e8d090' },
      { name: 'Uranus',  a: 19.18916, e: 0.04726, L: 313.2381, dL: 428.4820,    w: 170.9543, r: 2.5362e7, color: '#8bcde6' },
      { name: 'Neptune', a: 30.06992, e: 0.00859, L: -55.1203, dL: 218.4595,    w: 44.9648,  r: 2.4622e7, color: '#5a78ff' },
    ];

    function helioXY(p, date) {
      const T = (date - Date.UTC(2000, 0, 1, 12)) / (36525 * 864e5);
      const M = (p.L + p.dL * T - p.w) * D2R;
      let E = M;
      for (let i = 0; i < 6; i++) E -= (E - p.e * Math.sin(E) - M) / (1 - p.e * Math.cos(E));
      const xv = p.a * (Math.cos(E) - p.e);
      const yv = p.a * Math.sqrt(1 - p.e * p.e) * Math.sin(E);
      const lon = Math.atan2(yv, xv) + p.w * D2R;
      const rr = Math.hypot(xv, yv) * AU;
      return [rr * Math.cos(lon), rr * Math.sin(lon)];
    }

    // Sky direction + distance → position projected onto the same plane.
    const EPS = 23.4393 * D2R;

    function skyXY(raDeg, decDeg, distM) {
      const ra = raDeg * D2R, dec = decDeg * D2R;
      const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
      return [x * distM, (y * Math.cos(EPS) + z * Math.sin(EPS)) * distM];
    }

    // The heliosphere: the bubble blown by the solar wind. Its nose points into
    // the interstellar wind (ecliptic longitude ~255°); both Voyagers crossed
    // the heliopause near the nose, at 121 and 119 AU. The tail is modeled.
    const HELIO_NOSE = 255.4 * D2R;

    function helioShape(noseAu, tailStretch) {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const t = i / 96 * Math.PI * 2, off = (1 - Math.cos(t)) / 2;
        const r = noseAu * AU * (1 + tailStretch * Math.pow(off, 1.5));
        pts.push([r * Math.cos(HELIO_NOSE + t), r * Math.sin(HELIO_NOSE + t)]);
      }
      return pts;
    }

    // A nice round scale-bar length: 1, 2 or 5 of the unit being displayed.
    function niceBar(target) {
      const units = [LY * 1e9, LY * 1e6, LY * 1e3, LY, AU, KM * 1e6, KM, 1];
      const unit = units.find(u => target >= u * 0.999) || 1;
      const v = target / unit;
      const p = Math.pow(10, Math.floor(Math.log10(v)));
      const n = v / p >= 5 ? 5 : v / p >= 2 ? 2 : 1;
      return n * p * unit;
    }

    return {
      LOG_MIN, LOG_MAX, sliderToMeters, metersToSlider, KM, AU, LY, C_MS, D2R, sig, formatDistance, formatLightTime, SUP, powerOfTen, fade, EARTH_R, MOON_R, SUN_R, PLANETS, helioXY, EPS, skyXY, HELIO_NOSE, helioShape, niceBar
    };
  })();
