/*
 * Hand-written layer for the All-sky map in lessons/cosmology/constellations.html:
 * constellation meanings and origins, famous stars, "anomalies", and a low-precision
 * ephemeris for the Sun, Moon and planets.
 *
 * Positions are J2000 right ascension / declination in degrees. Entries marked
 * approx:true have positions that are only known to about a degree (for example the
 * Wow! signal, whose two beam horns leave an ambiguous direction).
 */
(function () {
  'use strict';

  // IDs are those used by assets/data/sky/allsky.json (IAU three-letter abbreviations;
  // Ser = Serpens Caput and Ser2 = Serpens Cauda).
  var MEANINGS = {
    And: 'the Chained Princess', Ant: 'the Air Pump', Aps: 'the Bird of Paradise', Aqr: 'the Water-Bearer',
    Aql: 'the Eagle', Ara: 'the Altar', Ari: 'the Ram', Aur: 'the Charioteer', Boo: 'the Herdsman',
    Cae: 'the Chisel', Cam: 'the Giraffe', Cnc: 'the Crab', CVn: 'the Hunting Dogs', CMa: 'the Great Dog',
    CMi: 'the Little Dog', Cap: 'the Sea-Goat', Car: 'the Keel of the ship Argo', Cas: 'the Queen',
    Cen: 'the Centaur', Cep: 'the King', Cet: 'the Sea Monster', Cha: 'the Chameleon', Cir: 'the Compass',
    Col: 'the Dove', Com: 'Berenice’s Hair', CrA: 'the Southern Crown', CrB: 'the Northern Crown',
    Crv: 'the Crow', Crt: 'the Cup', Cru: 'the Southern Cross', Cyg: 'the Swan', Del: 'the Dolphin',
    Dor: 'the Swordfish', Dra: 'the Dragon', Equ: 'the Little Horse', Eri: 'the River', For: 'the Furnace',
    Gem: 'the Twins', Gru: 'the Crane', Her: 'Hercules', Hor: 'the Clock', Hya: 'the Water Snake',
    Hyi: 'the Lesser Water Snake', Ind: 'the Indian', Lac: 'the Lizard', Leo: 'the Lion', LMi: 'the Little Lion',
    Lep: 'the Hare', Lib: 'the Scales', Lup: 'the Wolf', Lyn: 'the Lynx', Lyr: 'the Lyre', Men: 'Table Mountain',
    Mic: 'the Microscope', Mon: 'the Unicorn', Mus: 'the Fly', Nor: 'the Carpenter’s Square', Oct: 'the Octant',
    Oph: 'the Serpent-Bearer', Ori: 'the Hunter', Pav: 'the Peacock', Peg: 'the Winged Horse', Per: 'the Hero Perseus',
    Phe: 'the Phoenix', Pic: 'the Painter’s Easel', Psc: 'the Fishes', PsA: 'the Southern Fish', Pup: 'the Stern of the ship Argo',
    Pyx: 'the Mariner’s Compass', Ret: 'the Reticle (a telescope eyepiece grid)', Sge: 'the Arrow', Sgr: 'the Archer',
    Sco: 'the Scorpion', Scl: 'the Sculptor', Sct: 'the Shield', Ser: 'the Serpent’s Head', Ser2: 'the Serpent’s Tail',
    Sex: 'the Sextant', Tau: 'the Bull', Tel: 'the Telescope', Tri: 'the Triangle', TrA: 'the Southern Triangle',
    Tuc: 'the Toucan', UMa: 'the Great Bear', UMi: 'the Little Bear', Vel: 'the Sails of the ship Argo',
    Vir: 'the Maiden', Vol: 'the Flying Fish', Vul: 'the Fox'
  };

  // Ptolemy's 48 (the Almagest, about 150 CE); Argo Navis was later split into Car, Pup and Vel.
  var ANCIENT = ('And Aql Aqr Ara Ari Aur Boo Cnc CMa CMi Cap Cas Cen Cep Cet CrA CrB Crv Crt Cyg Del Dra Equ Eri Gem Her Hya Leo Lep Lib Lup Lyr ' +
    'Oph Ori Peg Per Psc PsA Sge Sgr Sco Ser Ser2 Tau Tri UMa UMi Vir Car Pup Vel').split(' ');
  var MODERN_BY = {};
  function tag(ids, who) { ids.split(' ').forEach(function (i) { MODERN_BY[i] = who; }); }
  tag('Aps Cha Dor Gru Hyi Ind Mus Pav Phe Tuc Vol', 'Pieter Keyser and Frederick de Houtman, southern-sky voyage (1595–97)');
  tag('Cru Col Cam Mon', 'Petrus Plancius (about 1592–1613)');
  tag('Com', 'Caspar Vopel (1536), from Ptolemy’s “Berenice’s hair” star cluster');
  tag('CVn Lac LMi Lyn Sct Sex Vul', 'Johannes Hevelius (1687)');
  tag('Ant Cae Cir For Hor Men Mic Nor Oct Pic Pyx Ret Scl Tel TrA', 'Nicolas-Louis de Lacaille (1750s), from the Cape of Good Hope');

  function originOf(id) {
    if (ANCIENT.indexOf(id) >= 0) return 'Ancient: one of Ptolemy’s 48 (about 150 CE)';
    return 'Modern: ' + (MODERN_BY[id] || 'added by early modern astronomers');
  }

  // Featured detailed views, keyed by the sim's constellation keys.
  var FEATURED = {
    orion: 'Ori', ursa: 'UMa', cassiopeia: 'Cas', cygnus: 'Cyg', aries: 'Ari', taurus: 'Tau', gemini: 'Gem', cancer: 'Cnc',
    leo: 'Leo', virgo: 'Vir', libra: 'Lib', scorpius: 'Sco', sagittarius: 'Sgr', capricornus: 'Cap', aquarius: 'Aqr', pisces: 'Psc'
  };

  var MESSIER_NAMES = {
    M1: 'Crab Nebula', M2: 'Globular Cluster in Aquarius', M3: 'Globular Cluster in Canes Venatici', M4: 'Globular Cluster near Antares',
    M5: 'Globular Cluster in Serpens', M6: 'Butterfly Cluster', M7: 'Ptolemy’s Cluster', M8: 'Lagoon Nebula', M11: 'Wild Duck Cluster',
    M13: 'Great Hercules Cluster', M16: 'Eagle Nebula', M17: 'Omega (Swan) Nebula', M20: 'Trifid Nebula', M22: 'Sagittarius Globular Cluster',
    M27: 'Dumbbell Nebula', M31: 'Andromeda Galaxy', M32: 'Companion of Andromeda', M33: 'Triangulum Galaxy', M35: 'M35 (open cluster)',
    M42: 'Orion Nebula', M44: 'Beehive Cluster (Praesepe)', M45: 'Pleiades', M51: 'Whirlpool Galaxy', M57: 'Ring Nebula',
    M63: 'Sunflower Galaxy', M64: 'Black Eye Galaxy', M74: 'Phantom Galaxy', M81: 'Bode’s Galaxy', M82: 'Cigar Galaxy',
    M87: 'Virgo A (giant elliptical galaxy)', M97: 'Owl Nebula', M101: 'Pinwheel Galaxy', M104: 'Sombrero Galaxy', M110: 'Companion of Andromeda'
  };

  var NAMED_STARS = [
    ['Sirius', 101.287, -16.716, -1.46, 'Brightest star in the night sky, 8.6 ly away, in Canis Major.'],
    ['Canopus', 95.988, -52.696, -0.74, 'Second-brightest star, a luminous white supergiant in Carina.'],
    ['Rigil Kentaurus', 219.90, -60.834, -0.27, 'Alpha Centauri A, part of the nearest star system to the Sun (4.4 ly).'],
    ['Arcturus', 213.915, 19.182, -0.05, 'An orange giant in Boötes, moving fast across the galaxy.'],
    ['Vega', 279.235, 38.784, 0.03, 'Once the pole star; the standard for the brightness scale in early photometry.'],
    ['Capella', 79.172, 45.998, 0.08, 'A pair of yellow giants in Auriga.'],
    ['Rigel', 78.634, -8.202, 0.13, 'Blue supergiant in Orion.'],
    ['Procyon', 114.825, 5.225, 0.34, 'Sun-like star with a white-dwarf companion, 11.5 ly away.'],
    ['Betelgeuse', 88.793, 7.407, 0.42, 'Red supergiant in Orion; the “Great Dimming” of 2019–20 made headlines.'],
    ['Achernar', 24.429, -57.237, 0.46, 'A fast-spinning star flattened into an oval, in Eridanus.'],
    ['Altair', 297.696, 8.868, 0.76, 'A rapidly spinning star in the Summer Triangle.'],
    ['Aldebaran', 68.980, 16.509, 0.86, 'The orange eye of Taurus.'],
    ['Antares', 247.352, -26.432, 1.06, 'Red supergiant, heart of Scorpius.'],
    ['Spica', 201.298, -11.161, 0.97, 'The star that revealed precession to Hipparchus.'],
    ['Pollux', 116.329, 28.026, 1.14, 'The nearest giant star, with a known planet.'],
    ['Fomalhaut', 344.413, -29.622, 1.16, 'A young star with a dusty debris ring, in Piscis Austrinus.'],
    ['Deneb', 310.358, 45.280, 1.25, 'Tail of the Swan; one of the most luminous stars we can see.'],
    ['Regulus', 152.093, 11.967, 1.35, 'The “little king” of Leo, sitting almost on the ecliptic.'],
    ['Polaris', 37.955, 89.264, 1.98, 'The North Star, within 1° of the celestial pole.']
  ];

  // Objects that are special for what they are, not for how bright they look.
  // kind: bh black hole, ns neutron star / pulsar, snr supernova remnant, sn supernova, xr X-ray source,
  //       qso quasar, star unusual star, exo planet host, sig signal, spot survey field, probe spacecraft, dir direction.
  var ANOMALIES = [
    { id: 'sgra', name: 'Sagittarius A*', kind: 'bh', ra: 266.417, dec: -29.008, tip: 'The supermassive black hole at the center of our galaxy, about 4 million Suns. The Event Horizon Telescope imaged its shadow in 2022.', link: ['event-horizon-telescope.html', 'Event Horizon Telescope'] },
    { id: 'm87', name: 'M87*', kind: 'bh', ra: 187.706, dec: 12.391, tip: 'A 6.5-billion-solar-mass black hole in the Virgo Cluster’s giant galaxy, the first black hole ever imaged (2019). Its jet, seen in 1918, is a “curious straight ray.”', link: ['event-horizon-telescope.html', 'Event Horizon Telescope'] },
    { id: 'cygx1', name: 'Cygnus X-1', kind: 'bh', ra: 299.590, dec: 35.202, tip: 'The first widely accepted stellar black hole (about 21 Suns), discovered as an X-ray source in 1964 and matched to a blue supergiant in 1971.' },
    { id: 'crab', name: 'Crab Pulsar', kind: 'ns', ra: 83.633, dec: 22.015, tip: 'A neutron star that spins 30 times a second, the core left by the supernova Chinese astronomers recorded in 1054.' },
    { id: 'vela', name: 'Vela Pulsar', kind: 'ns', ra: 128.836, dec: -45.176, tip: 'A neutron star spinning every 89 milliseconds, at the heart of a supernova remnant about 11,000 years old. It occasionally “glitches” and speeds up.' },
    { id: 'casa', name: 'Cassiopeia A', kind: 'snr', ra: 350.86, dec: 58.81, tip: 'Debris of a supernova from about 1680, the brightest radio source beyond the solar system; its gas is rich in oxygen, silicon, sulfur and iron.' },
    { id: 'tycho', name: 'Tycho’s Supernova (SN 1572)', kind: 'sn', ra: 6.34, dec: 64.15, tip: 'The “new star” of November 1572 whose lack of parallax showed the heavens can change.', link: ['tycho-brahe.html', 'Tycho Brahe'] },
    { id: 'kepler', name: 'Kepler’s Supernova (SN 1604)', kind: 'sn', ra: 262.67, dec: -21.48, tip: 'The most recent supernova seen in our own galaxy with the naked eye, in October 1604.', link: ['keplers-laws.html', 'Kepler’s Laws'] },
    { id: 'sn1987a', name: 'SN 1987A', kind: 'sn', ra: 83.867, dec: -69.27, tip: 'The nearest supernova in modern times, in the Large Magellanic Cloud; detectors on Earth caught its neutrinos.' },
    { id: 'scox1', name: 'Scorpius X-1', kind: 'xr', ra: 244.979, dec: -15.640, tip: 'The first X-ray source found outside the solar system (1962); a neutron star pulling gas from a companion.' },
    { id: '3c273', name: '3C 273', kind: 'qso', ra: 187.278, dec: 2.052, tip: 'The first quasar identified (1963). Its light is redshifted by 0.158, about 2.4 billion light-years away.', link: ['universe-expansion.html', 'Universe Expansion'] },
    { id: 'etacar', name: 'Eta Carinae', kind: 'star', ra: 161.265, dec: -59.684, tip: 'A doomed pair of massive stars that erupted in the 1840s, briefly becoming the second-brightest star in the sky. It may explode as a supernova.' },
    { id: 'tabby', name: 'Tabby’s Star (KIC 8462852)', kind: 'star', ra: 301.564, dec: 44.457, tip: 'Dimmed irregularly by up to about 20% in Kepler data, prompting exotic ideas; dust clouds are now the leading explanation.' },
    { id: 'prox', name: 'Proxima Centauri', kind: 'exo', ra: 217.429, dec: -62.680, tip: 'The nearest star to the Sun (4.24 ly). Its planet Proxima b, found in 2016, orbits in the habitable zone.' },
    { id: 'barnard', name: 'Barnard’s Star', kind: 'star', ra: 269.452, dec: 4.693, tip: 'The star with the fastest apparent motion across the sky (10 arcseconds a year), about 6 ly away.' },
    { id: 'trappist', name: 'TRAPPIST-1', kind: 'exo', ra: 346.622, dec: -5.043, tip: 'A cool red dwarf 40 ly away with seven Earth-sized planets, several in the habitable zone.', link: ['roman-space-telescope.html', 'Roman Space Telescope'] },
    { id: 'keplerfield', name: 'Kepler field', kind: 'spot', ra: 290.67, dec: 44.5, tip: 'For four years (2009–2013) NASA’s Kepler telescope stared at this patch of Cygnus and Lyra and found thousands of planets by their transits.', link: ['roman-space-telescope.html', 'Roman Space Telescope'] },
    { id: 'hdf', name: 'Hubble Deep Field', kind: 'spot', ra: 189.2, dec: 62.216, tip: 'A tiny patch of “empty” sky in Ursa Major where Hubble found about 3,000 galaxies in December 1995.' },
    { id: 'wow', name: 'Wow! signal (approx.)', kind: 'sig', ra: 291.4, dec: -27.05, approx: true, tip: 'A 72-second narrowband radio burst recorded by the Big Ear telescope on August 15, 1977 and never heard again. The direction is uncertain by about a degree.', link: ['seti-search.html', 'SETI'] },
    { id: 'apex', name: 'Direction of the Sun’s motion (CMB dipole)', kind: 'dir', ra: 167.9, dec: -6.9, approx: true, tip: 'Relative to the afterglow of the Big Bang (the cosmic microwave background), the Sun and Earth move toward this point at about 370 km/s.', link: ['origins-of-the-universe.html', 'Origins of the Universe'] },
    { id: 'voyager1', name: 'Voyager 1 direction (approx.)', kind: 'probe', ra: 257.5, dec: 12.3, approx: true, tip: 'The most distant human-made object, more than 160 times farther from the Sun than Earth, heading out toward Ophiuchus. Its 1990 “Pale Blue Dot” photo looked back at Earth.', link: ['pale-blue-dot.html', 'Pale Blue Dot'] },
    { id: 'lmc', name: 'Large Magellanic Cloud', kind: 'gal', ra: 80.894, dec: -69.756, tip: 'A satellite galaxy of the Milky Way about 160,000 light-years away, home of the Tarantula Nebula and SN 1987A.' },
    { id: 'coalsack', name: 'Coalsack (approx.)', kind: 'dark', ra: 192.5, dec: -63, approx: true, tip: 'A dark dust cloud that blocks the Milky Way behind it, the “head” of the Emu in Aboriginal Australian sky lore.' }
  ];

  var ANOMALY_LABELS = {
    bh: 'Black hole', ns: 'Neutron star / pulsar', snr: 'Supernova remnant', sn: 'Historical supernova', xr: 'X-ray source',
    qso: 'Quasar', star: 'Unusual star', exo: 'Exoplanet host', spot: 'Famous survey field', sig: 'Mystery signal',
    dir: 'Cosmic direction', probe: 'Spacecraft', gal: 'Neighbor galaxy', dark: 'Dark nebula'
  };

  // ── Low-precision ephemeris (after Paul Schlyter, "How to compute planetary positions") ──
  var RAD = Math.PI / 180;
  function rev(x) { return x - Math.floor(x / 360) * 360; }
  function sind(x) { return Math.sin(x * RAD); }
  function cosd(x) { return Math.cos(x * RAD); }

  function elements(name, d) {
    switch (name) {
      case 'Sun':     return { N: 0, i: 0, w: 282.9404 + 4.70935e-5 * d, a: 1, e: 0.016709 - 1.151e-9 * d, M: 356.0470 + 0.9856002585 * d };
      case 'Mercury': return { N: 48.3313 + 3.24587e-5 * d, i: 7.0047 + 5.00e-8 * d, w: 29.1241 + 1.01444e-5 * d, a: 0.387098, e: 0.205635 + 5.59e-10 * d, M: 168.6562 + 4.0923344368 * d };
      case 'Venus':   return { N: 76.6799 + 2.46590e-5 * d, i: 3.3946 + 2.75e-8 * d, w: 54.8910 + 1.38374e-5 * d, a: 0.723330, e: 0.006773 - 1.302e-9 * d, M: 48.0052 + 1.6021302244 * d };
      case 'Mars':    return { N: 49.5574 + 2.11081e-5 * d, i: 1.8497 - 1.78e-8 * d, w: 286.5016 + 2.92961e-5 * d, a: 1.523688, e: 0.093405 + 2.516e-9 * d, M: 18.6021 + 0.5240207766 * d };
      case 'Jupiter': return { N: 100.4542 + 2.76854e-5 * d, i: 1.3030 - 1.557e-7 * d, w: 273.8777 + 1.64505e-5 * d, a: 5.20256, e: 0.048498 + 4.469e-9 * d, M: 19.8950 + 0.0830853001 * d };
      case 'Saturn':  return { N: 113.6634 + 2.38980e-5 * d, i: 2.4886 - 1.081e-7 * d, w: 339.3939 + 2.97661e-5 * d, a: 9.55475, e: 0.055546 - 9.499e-9 * d, M: 316.9670 + 0.0334442282 * d };
      case 'Uranus':  return { N: 74.0005 + 1.3978e-5 * d, i: 0.7733 + 1.9e-8 * d, w: 96.6612 + 3.0565e-5 * d, a: 19.18171 - 1.55e-8 * d, e: 0.047318 + 7.45e-9 * d, M: 142.5905 + 0.011725806 * d };
      case 'Neptune': return { N: 131.7806 + 3.0173e-5 * d, i: 1.7700 - 2.55e-7 * d, w: 272.8461 - 6.027e-6 * d, a: 30.05826 + 3.313e-8 * d, e: 0.008606 + 2.15e-9 * d, M: 260.2471 + 0.005995147 * d };
      case 'Moon':    return { N: 125.1228 - 0.0529538083 * d, i: 5.1454, w: 318.0634 + 0.1643573223 * d, a: 60.2666, e: 0.0549, M: 115.3654 + 13.0649929509 * d };
    }
    return null;
  }

  // Heliocentric (or geocentric for Sun/Moon) ecliptic rectangular coordinates from Kepler's equation.
  function orbit(el) {
    var M = rev(el.M);
    var E = M + (el.e / RAD) * sind(M) * (1 + el.e * cosd(M));
    for (var k = 0; k < 8; k++) {
      var dE = (E - (el.e / RAD) * sind(E) - M) / (1 - el.e * cosd(E));
      E -= dE;
      if (Math.abs(dE) < 1e-7) break;
    }
    var xv = el.a * (cosd(E) - el.e);
    var yv = el.a * Math.sqrt(1 - el.e * el.e) * sind(E);
    var v = Math.atan2(yv, xv) / RAD;
    var r = Math.sqrt(xv * xv + yv * yv);
    var vw = v + el.w;
    var x = r * (cosd(el.N) * cosd(vw) - sind(el.N) * sind(vw) * cosd(el.i));
    var y = r * (sind(el.N) * cosd(vw) + cosd(el.N) * sind(vw) * cosd(el.i));
    return { r: r, lon: rev(Math.atan2(y, x) / RAD), x: x, y: y, z: r * sind(vw) * sind(el.i) };
  }

  function toEquatorial(x, y, z, d) {
    var ecl = 23.4393 - 3.563e-7 * d;
    var xe = x;
    var ye = y * cosd(ecl) - z * sind(ecl);
    var ze = y * sind(ecl) + z * cosd(ecl);
    return { ra: rev(Math.atan2(ye, xe) / RAD), dec: Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) / RAD };
  }

  /** Returns [{name, ra, dec, dist}] for the Sun, Moon and planets at the given Date. */
  function ephemeris(date) {
    var jd = date.getTime() / 86400000 + 2440587.5;
    var d = jd - 2451543.5;
    var sunEl = elements('Sun', d);
    var sun = orbit(sunEl);
    var out = [];
    var sunEq = toEquatorial(sun.r * cosd(sun.lon), sun.r * sind(sun.lon), 0, d);
    out.push({ name: 'Sun', ra: sunEq.ra, dec: sunEq.dec, dist: sun.r });

    // Moon, with the largest perturbation terms.
    var moonEl = elements('Moon', d);
    var moon = orbit(moonEl);
    var Ms = rev(sunEl.M), Mm = rev(moonEl.M);
    var Ls = rev(sunEl.M + sunEl.w), Lm = rev(moonEl.M + moonEl.w + moonEl.N);
    var D = rev(Lm - Ls), F = rev(Lm - moonEl.N);
    var dLon = -1.274 * sind(Mm - 2 * D) + 0.658 * sind(2 * D) - 0.186 * sind(Ms) - 0.059 * sind(2 * Mm - 2 * D) -
      0.057 * sind(Mm - 2 * D + Ms) + 0.053 * sind(Mm + 2 * D) + 0.046 * sind(2 * D - Ms) + 0.041 * sind(Mm - Ms) -
      0.035 * sind(D) - 0.031 * sind(Mm + Ms) - 0.015 * sind(2 * F - 2 * D) + 0.011 * sind(Mm - 4 * D);
    var dLat = -0.173 * sind(F - 2 * D) - 0.055 * sind(Mm - F - 2 * D) - 0.046 * sind(Mm + F - 2 * D) +
      0.033 * sind(F + 2 * D) + 0.017 * sind(2 * Mm + F);
    var mLon = moon.lon + dLon;
    var mLat = Math.asin(moon.z / moon.r) / RAD + dLat;
    var mr = moon.r;
    var moonEq = toEquatorial(mr * cosd(mLat) * cosd(mLon), mr * cosd(mLat) * sind(mLon), mr * sind(mLat), d);
    out.push({ name: 'Moon', ra: moonEq.ra, dec: moonEq.dec, dist: mr, elong: rev(mLon - sun.lon) });

    ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].forEach(function (name) {
      var p = orbit(elements(name, d));
      var gx = p.x + sun.r * cosd(sun.lon);
      var gy = p.y + sun.r * sind(sun.lon);
      var eq = toEquatorial(gx, gy, p.z, d);
      out.push({ name: name, ra: eq.ra, dec: eq.dec, dist: Math.sqrt(gx * gx + gy * gy + p.z * p.z) });
    });
    return out;
  }

  window.ALLSKY_EXTRAS = {
    meanings: MEANINGS,
    originOf: originOf,
    featured: FEATURED,
    messierNames: MESSIER_NAMES,
    namedStars: NAMED_STARS,
    anomalies: ANOMALIES,
    anomalyLabels: ANOMALY_LABELS,
    ephemeris: ephemeris
  };
}());
