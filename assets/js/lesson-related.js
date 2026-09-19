/*
 * Cross-references from other lessons back to the Constellations lesson.
 * Loaded by lesson-print-button.js, which every lesson already includes, so a new
 * link only needs an entry in LINKS below. Keyed by path under /lessons/.
 * Lessons with their own hand-written "Continue Exploring" block (Constellations)
 * have no entry here.
 */
(function () {
  'use strict';

  var CONSTELLATIONS = 'cosmology/constellations.html';

  var LINKS = {
    'cosmology/tycho-brahe.html': [[CONSTELLATIONS, 'Constellations: Cassiopeia and SN 1572', 'Find Cassiopeia on the star map, see where Tycho’s “new star” blazed in 1572, and read about the supernova remnant it left behind.']],
    'cosmology/uraniborg.html': [[CONSTELLATIONS, 'Constellations: the sky Brahe measured', 'Explore the star patterns Brahe catalogued, plus the Cassiopeia supernova of 1572.']],
    'cosmology/keplers-laws.html': [[CONSTELLATIONS, 'Constellations: the zodiac and the ecliptic', 'The planets Kepler tracked wander along the ecliptic through the twelve zodiac constellations.']],
    'cosmology/heliocentrism.html': [[CONSTELLATIONS, 'Constellations: the fixed stars', 'The stars that stayed “fixed” behind the wandering planets. Learn each constellation’s history and the light of its stars.']],
    'cosmology/planetary-system.html': [[CONSTELLATIONS, 'Constellations: where planets were found', 'Uranus was found in Gemini and Pluto near Delta Geminorum. Explore the zodiac band where the planets travel.']],
    'cosmology/kuiper-belt.html': [[CONSTELLATIONS, 'Constellations: Gemini, home of Pluto’s discovery', 'Clyde Tombaugh found Pluto among the stars of Gemini in 1930. See the twins and their neighbors.']],
    'cosmology/universe-expansion.html': [[CONSTELLATIONS, 'Constellations: Virgo and the first quasar', 'Virgo holds a cluster of over a thousand galaxies and 3C 273, whose redshift revealed the first quasar.']],
    'cosmology/origins-of-the-universe.html': [[CONSTELLATIONS, 'Constellations: where the elements were forged', 'Cassiopeia A, Betelgeuse and Antares show how stars cook and scatter the heavy elements.']],
    'cosmology/event-horizon-telescope.html': [[CONSTELLATIONS, 'Constellations: aim at M87 and Sgr A*', 'M87 lies in Virgo and Sagittarius A* in Sagittarius. Learn to find the constellations the EHT targeted.']],
    'cosmology/roman-space-telescope.html': [[CONSTELLATIONS, 'Constellations: where exoplanets live', 'Kepler’s field is in Cygnus, TRAPPIST-1 in Aquarius, and 55 Cancri in Cancer.']],
    'cosmology/seti-search.html': [[CONSTELLATIONS, 'Constellations: the Wow! signal in Sagittarius', 'The 1977 Wow! signal came from the direction of Sagittarius. Explore that region of the sky.']],
    'cosmology/arecibo-message.html': [[CONSTELLATIONS, 'Constellations: learn the sky it was aimed into', 'Practice star-hopping across the northern sky with an interactive map.']],
    'cosmology/pale-blue-dot.html': [[CONSTELLATIONS, 'Constellations: the neighborhood of the pale blue dot', 'Every star in a constellation is another sun. Find their distances, temperatures and histories.']],
    'earth-science/seasons-and-the-heavens.html': [[CONSTELLATIONS, 'Constellations: the zodiac, precession and Spica', 'See how the equinox point has drifted from Aries into Pisces, and how Hipparchus discovered precession from Spica.']],
    'physics/speed-of-light.html': [[CONSTELLATIONS, 'Constellations: every star is a look back in time', 'Betelgeuse is about 700 ly away, Deneb about 2,600. Click stars to see the age of the light you’re seeing.']],
    'chemistry/periodic-table.html': [[CONSTELLATIONS, 'Constellations: elements in starlight', 'Helium was found in the Sun before Earth. Read the spectra of Betelgeuse, Rigel, Cassiopeia A and more.']]
  };

  var script = document.currentScript;
  var path = location.pathname.replace(/^.*\/lessons\//, '');
  var entries = LINKS[path];
  if (!entries || !script || !script.src) return;

  var base = new URL('../../lessons/', script.src).href;

  function build() {
    if (document.querySelector('.lesson-related')) return;

    var style = document.createElement('style');
    style.textContent =
      '.lesson-related{max-width:960px;margin:2rem auto;padding:1rem 1.25rem;border:1px solid rgba(128,128,128,.4);' +
      'border-radius:12px;background:rgba(128,128,128,.1);color:inherit;font:inherit;line-height:1.5}' +
      '.lesson-related h2{font-size:1rem;margin:0 0 .5rem;color:inherit}' +
      '.lesson-related a{color:inherit;font-weight:700;text-decoration:underline}' +
      '.lesson-related p{margin:.15rem 0 .6rem;color:inherit}' +
      '@media print{.lesson-related{display:none}}';
    document.head.appendChild(style);

    var box = document.createElement('aside');
    box.className = 'lesson-related';
    box.setAttribute('aria-labelledby', 'lesson-related-title');
    var h = document.createElement('h2');
    h.id = 'lesson-related-title';
    h.textContent = 'Related lessons';
    box.appendChild(h);

    entries.forEach(function (e) {
      var p = document.createElement('p');
      var a = document.createElement('a');
      a.href = base + e[0];
      a.textContent = e[1] + ' →';
      p.appendChild(a);
      p.appendChild(document.createElement('br'));
      p.appendChild(document.createTextNode(e[2]));
      box.appendChild(p);
    });

    var host = document.querySelector('main') || document.body;
    host.appendChild(box);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build, { once: true });
  } else {
    build();
  }
}());
