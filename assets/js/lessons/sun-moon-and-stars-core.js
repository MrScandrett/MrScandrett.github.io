/* SunMoonCore: the DOM-free astronomy of the Sun, Moon and Stars lesson (lessons/earth-science/sun-moon-and-stars.html).
 * formatTime and moonPhasesData moved unchanged out of the page's inline <script>; sinAltitude, illuminatedFraction
 * and nearestPhase are the expressions its draw code used inline, lifted out. sun-moon-and-stars.js needs this
 * file first. Tested in tests/sun-moon-and-stars-core.test.mjs. */
  var SunMoonCore = (function () {
    function formatTime(h) {
      const hh = Math.floor(h);
      const mm = Math.floor((h - hh) * 60);
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }

    const moonPhasesData = [
      { name: "New Moon", angle: 0, illum: "0%", day: 0.0, desc: "The Moon is between Earth and Sun. Its illuminated face points away from Earth. Invisible in the solar glare." },
      { name: "Waxing Crescent", angle: 45, illum: "25%", day: 3.7, desc: "A slender silver crescent visible in the western sky just after sunset. Waxing means growing larger each day." },
      { name: "First Quarter", angle: 90, illum: "50%", day: 7.4, desc: "Rises at noon, peaks south at sunset, sets at midnight. Half of the visible lunar disc is brilliantly lit." },
      { name: "Waxing Gibbous", angle: 135, illum: "75%", day: 11.1, desc: "Bulging past half towards full. Dominates the eastern evening sky for most of the night." },
      { name: "Full Moon", angle: 180, illum: "100%", day: 14.8, desc: "Directly opposite the Sun. Rises at sunset and stays visible all night long, setting at sunrise." },
      { name: "Waning Gibbous", angle: 225, illum: "75%", day: 18.5, desc: "Rises later in the evening and shrinks gradually. Waning means decreasing in illuminated size." },
      { name: "Third / Last Quarter", angle: 270, illum: "50%", day: 22.1, desc: "Rises at midnight and remains visible in the morning sky until noon. Half illuminated on the left." },
      { name: "Waning Crescent", angle: 315, illum: "25%", day: 25.8, desc: "A faint curved sliver visible in the eastern dawn sky just before sunrise, completing the cycle." }
    ];

    /* Sine of the Sun's altitude on an equinox day (declination 0°): latitude and hour angle in degrees. */
    function sinAltitude(lat, hourAngle) {
      return Math.cos(lat * Math.PI / 180) * Math.cos(hourAngle * Math.PI / 180);
    }

    /* Lit share of the Moon's face, 0 to 1, from the Sun–Earth–Moon angle in degrees (0 = new, 180 = full). */
    function illuminatedFraction(normAngle) {
      return (1 - Math.cos(normAngle * Math.PI / 180)) / 2;
    }

    /* The named phase whose angle is closest to normAngle (0–360). */
    function nearestPhase(normAngle) {
      let closest = moonPhasesData[0];
      let minDiff = 999;
      moonPhasesData.forEach(p => {
        const diff = Math.abs(p.angle - normAngle);
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      });
      return closest;
    }

    return {
      formatTime, moonPhasesData, sinAltitude, illuminatedFraction, nearestPhase
    };
  })();
