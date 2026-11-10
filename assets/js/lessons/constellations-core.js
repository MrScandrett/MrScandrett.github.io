/* ConstellationsCore: DOM-free sky maths for the Constellations lesson (lessons/cosmology/constellations.html):
 * angular distance between stars, RA/Dec wording, and the three-anchor affine fit that pins figure artwork to
 * its stars. Moved unchanged out of the page's inline <script>; constellations.js needs this file first.
 * Tested in tests/constellations-core.test.mjs. */
  var ConstellationsCore = (function () {
    'use strict';

    // ── Authoritative modern line figures ─────────────────────────────────
    function angularDistance(a, b) {
      var deltaRa = ((a.ra - b.ra + 540) % 360) - 180;
      var meanDec = (a.dec + b.dec) / 2 * Math.PI / 180;
      return Math.hypot(deltaRa * Math.cos(meanDec), a.dec - b.dec);
    }

    function affineFromAnchors(source, destination) {
      var x1 = source[0][0], y1 = source[0][1];
      var x2 = source[1][0], y2 = source[1][1];
      var x3 = source[2][0], y3 = source[2][1];
      var denominator = x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2);
      if (Math.abs(denominator) < 0.0001) return null;

      function coefficients(v1, v2, v3) {
        return {
          x: (v1 * (y2 - y3) + v2 * (y3 - y1) + v3 * (y1 - y2)) / denominator,
          y: (v1 * (x3 - x2) + v2 * (x1 - x3) + v3 * (x2 - x1)) / denominator,
          offset: (
            v1 * (x2 * y3 - x3 * y2) +
            v2 * (x3 * y1 - x1 * y3) +
            v3 * (x1 * y2 - x2 * y1)
          ) / denominator
        };
      }

      var horizontal = coefficients(destination[0].x, destination[1].x, destination[2].x);
      var vertical = coefficients(destination[0].y, destination[1].y, destination[2].y);
      return {
        a: horizontal.x,
        b: vertical.x,
        c: horizontal.y,
        d: vertical.y,
        e: horizontal.offset,
        f: vertical.offset
      };
    }

    function formatRa(degrees) {
      var totalMinutes = degrees / 15 * 60;
      var hours = Math.floor(totalMinutes / 60);
      var minutes = Math.round(totalMinutes % 60);
      if (minutes === 60) { hours = (hours + 1) % 24; minutes = 0; }
      return String(hours).padStart(2, '0') + 'h ' + String(minutes).padStart(2, '0') + 'm';
    }

    function formatDec(degrees) {
      var sign = degrees >= 0 ? '+' : '−';
      var absolute = Math.abs(degrees);
      var whole = Math.floor(absolute);
      var minutes = Math.round((absolute - whole) * 60);
      if (minutes === 60) { whole++; minutes = 0; }
      return sign + String(whole).padStart(2, '0') + '° ' + String(minutes).padStart(2, '0') + '′';
    }

    return {
      angularDistance, affineFromAnchors, formatRa, formatDec
    };
  })();
