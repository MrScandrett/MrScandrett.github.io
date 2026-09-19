/*
 * Lore for the Constellations lesson: when each figure entered the record,
 * when notable stars and deep-sky objects were found, and what spectroscopy
 * tells us about them. Keyed like CONSTS in lessons/cosmology/constellations.html;
 * star keys match the `name` of each entry in that page's star list.
 *
 * Dates are the commonly cited first records; distances and temperatures are
 * rounded modern values (Gaia / Hipparcos era) and will differ slightly by source.
 */
window.CONSTELLATION_LORE = {

  /* Plain-language reading of a spectral class, used when a star has no entry of its own. */
  types: {
    O: { temp: '>30,000 K', look: 'Ionized helium (He II) lines and weak hydrogen: the hottest, bluest, rarest stars, living only a few million years.' },
    B: { temp: '10,000–30,000 K', look: 'Neutral helium lines, moderate hydrogen. Massive, blue-white and short-lived.' },
    A: { temp: '7,500–10,000 K', look: 'The strongest hydrogen Balmer lines of any class. White stars; many spin fast.' },
    F: { temp: '6,000–7,500 K', look: 'Weaker hydrogen, strengthening ionized calcium (Ca II H and K) and the first metal lines.' },
    G: { temp: '5,200–6,000 K', look: 'Strong Ca II H and K plus many neutral metals: the Sun’s class. Yellow.' },
    K: { temp: '3,700–5,200 K', look: 'Crowded neutral-metal lines and the first molecular bands. Orange; cool enough for chemistry.' },
    M: { temp: '<3,700 K', look: 'Broad titanium-oxide (TiO) molecular bands dominate. Red; giants and supergiants of this class are swollen and losing gas.' }
  },

  general: {
    ptolemy: 'All sixteen figures in this observatory are among the 48 constellations that Ptolemy listed in the Almagest (about 150 CE). Libra appeared there as the Claws of the Scorpion.',
    bayer: 'Johann Bayer’s Uranometria (1603) introduced the Greek-letter names (Alpha, Beta, …) that are still used. John Flamsteed’s numbered stars (1712–1725) followed.',
    iau: 'The IAU adopted 88 official constellations in 1922 and fixed their boundaries in 1930 (drawn by Eugène Delporte along lines of right ascension and declination).'
  },

  orion: {
    origin: 'One of the oldest recognized figures. Homer and Hesiod (about 8th century BCE) already knew Orion the hunter; Sumerian and Babylonian sky-watchers saw a shepherd or a “True Shepherd of Anu.”',
    modern: 'Belt stars Alnitak, Alnilam and Mintaka are among the most recognized three stars in the sky; the whole figure lies along the celestial equator, so it is seen from every inhabited continent.',
    objects: [
      ['Orion Nebula (M42)', 'Seen with a telescope by Nicolas-Claude Fabri de Peiresc in 1610 and catalogued by Messier in 1769. William Huggins’s 1864–65 spectrum showed bright emission lines: proof that it is glowing gas, not unresolved stars.'],
      ['“Nebulium” mystery', 'The nebula’s strongest green line (500.7 nm) matched no known element, so astronomers proposed a new one, “nebulium.” In 1927 Ira Bowen showed it is doubly ionized oxygen radiating under near-vacuum conditions that no lab could make.'],
      ['Horsehead Nebula', 'Found in 1888 by Williamina Fleming on a Harvard photographic plate. It is a dark dust cloud silhouetted against glowing hydrogen (IC 434).']
    ],
    tidbits: [
      'Orion sets as Scorpius rises, so the two are never in the sky together. The old Greek story says the Scorpion killed him.',
      'Betelgeuse and Rigel differ in color (red vs. blue-white) because of temperature: about 3,600 K against 12,000 K. That single glance is a thermometer reading.',
      'The Belt points to Sirius, the brightest star in the night sky, which lies in Canis Major.'
    ],
    stars: {
      'Betelgeuse': {
        bayer: 'α Orionis', spec: 'M1–M2 Ia–Iab · ~3,600 K',
        history: 'Known since prehistory; John Herschel noted its brightness changes in 1836. In 1920 Michelson and Pease used an interferometer to measure its disk, the first direct size for any star other than the Sun. The Hubble Space Telescope imaged the surface in 1995.',
        physics: 'Titanium-oxide bands plus lines of neutral metals; the atmosphere holds CO and water vapor. Nitrogen-rich, carbon-poor gas shows that mixing has dredged up fusion products. Its radius is roughly 700–900 solar radii. The “Great Dimming” of 2019–20 was a cloud of dust the star had blown out. A faint companion was reported in 2025.'
      },
      'Rigel': {
        bayer: 'β Orionis', spec: 'B8 Ia · ~12,000 K',
        history: 'Known since antiquity. F. G. W. Struve found its close companion in 1831; Rigel is a multiple system.',
        physics: 'Neutral helium and strong hydrogen lines mark a hot blue supergiant, roughly 100,000 times the Sun’s luminosity. Its lines shift slightly over days as the star pulsates.'
      },
      'Bellatrix': {
        bayer: 'γ Orionis', spec: 'B2 III · ~22,000 K',
        history: 'Latin for “female warrior.” Its name was fixed by medieval and Renaissance star lists.',
        physics: 'A hot blue giant about 250 ly away, only tens of millions of years old, yet already nearing the end of its short life.'
      },
      'Alnitak': {
        bayer: 'ζ Orionis', spec: 'O9.5 Ib · ~29,000 K',
        history: 'Arabic for “the girdle.” Alnitak is a triple star; its glare lights the nearby Flame Nebula (NGC 2024) and the Horsehead.',
        physics: 'The hottest of the three Belt stars, with lines of ionized helium in its spectrum and a strong stellar wind streaming off it.'
      },
      'Alnilam': {
        bayer: 'ε Orionis', spec: 'B0 Ia · ~27,000 K',
        history: 'Arabic for “string of pearls.” It sits at the center of the Belt.',
        physics: 'A blue supergiant about 400,000 times the Sun’s luminosity, so distant that its parallax is hard to pin down, and estimates range from about 1,200 to 2,000 ly.'
      },
      'Mintaka': {
        bayer: 'δ Orionis', spec: 'O9.5 II · ~30,000 K',
        history: 'In 1904 Johannes Hartmann noticed that its calcium K line stayed put while the star’s other lines swung back and forth with orbital motion. That “stationary” line came from gas between the stars, the first detection of the interstellar medium.',
        physics: 'It is an eclipsing multiple system. Because it lies within a fraction of a degree of the celestial equator, it rises due east and sets due west from almost anywhere on Earth.'
      },
      'Saiph': {
        bayer: 'κ Orionis', spec: 'B0.5 Ia · ~26,500 K',
        history: 'From Arabic “sword of the giant.”',
        physics: 'Nearly as luminous as Rigel, but so hot that most of its output is ultraviolet, which is why it looks dimmer to the eye.'
      }
    }
  },

  ursa: {
    origin: 'Greeks called the figure Arktos, “the Bear” (Homer’s Iliad also calls it the Wain). Many Native American peoples, including the Mi’kmaq, independently saw a bear followed by hunters in the same stars.',
    modern: 'The Big Dipper is an asterism within Ursa Major, which is the third-largest constellation.',
    objects: [
      ['Ursa Major Moving Group', 'In 1869 Richard Proctor noticed that five of the Dipper’s stars (all except Dubhe and Alkaid) drift together through space: a scattered cluster about 80 ly away that formed together.'],
      ['M81 and M82', 'Johann Bode found this galaxy pair in 1774. M82 is a starburst galaxy pouring out hydrogen and dust; M81 is a grand-design spiral.'],
      ['Pinwheel Galaxy (M101)', 'Found by Pierre Méchain in 1781, a face-on spiral about 21 million ly away.'],
      ['Hubble Deep Field', 'In December 1995 Hubble stared at one tiny patch here for ten days and found about 3,000 galaxies in a spot the width of a grain of sand held at arm’s length.']
    ],
    tidbits: [
      'Mizar and Alcor is an old naked-eye vision test; Arab tradition used it to check eyesight.',
      'Because of proper motion, the Dipper’s shape was different 100,000 years ago and will differ again in 100,000 more. Dubhe and Alkaid drift the opposite way from the other five.',
      'The two pointers, Dubhe and Merak, aim at Polaris, but Polaris is fainter than they are (magnitude 2.0).'
    ],
    stars: {
      'Dubhe': {
        bayer: 'α Ursae Majoris', spec: 'K0 III · ~4,600 K',
        history: 'Name from Arabic “bear.” It is a multiple system: a visible companion plus a close spectroscopic pair.',
        physics: 'An orange giant with strong neutral metal lines, cooler and older than the white stars around it.'
      },
      'Merak': {
        bayer: 'β Ursae Majoris', spec: 'A1 V · ~9,400 K',
        history: 'Arabic for “the loins.” Merak is a member of the moving group.',
        physics: 'It has an infrared excess that shows a cool dust disk, seen by the IRAS satellite in the 1980s.'
      },
      'Phecda': {
        bayer: 'γ Ursae Majoris', spec: 'A0 Ve · ~9,700 K',
        history: 'Arabic for “thigh.”',
        physics: 'A white main-sequence star, a member of the moving group, spinning fast.'
      },
      'Megrez': {
        bayer: 'δ Ursae Majoris', spec: 'A3 V · ~9,000 K',
        history: 'Arabic for “root of the tail.” It is the faintest star of the Dipper’s seven.',
        physics: 'Faint because it is intrinsically dimmer than its neighbors (about 14 times the Sun’s light), not because it is farther away.'
      },
      'Alioth': {
        bayer: 'ε Ursae Majoris', spec: 'A1 IIIp · ~9,500 K',
        history: 'Its Bayer letter is Epsilon, though it is the brightest of the seven; Bayer sometimes ordered by position, not brightness.',
        physics: 'A chemically peculiar (Ap) star with a strong magnetic field, the brightest example in the sky. Its spectrum shows unusual strengths of silicon, chromium and europium, and the lines vary over a 5.1-day rotation.'
      },
      'Mizar': {
        bayer: 'ζ Ursae Majoris', spec: 'A2 V · ~9,000 K',
        history: 'One of the first telescopic doubles (seen in 1617 by Galileo, on Benedetto Castelli’s suggestion), first double star photographed (George Bond, 1857), and the first spectroscopic binary (Edward Pickering, 1889).',
        physics: 'Mizar and Alcor together are actually six stars: Mizar A and B are each a close pair and Alcor also has a companion. Pickering saw Mizar A’s lines split and merge every 20.5 days as the two stars orbit.'
      },
      'Alkaid': {
        bayer: 'η Ursae Majoris', spec: 'B3 V · ~15,500 K',
        history: 'Arabic for “the leader of the mourners.” Alkaid is not in the moving group.',
        physics: 'The only blue-white star in the Dipper: hotter, more massive and far younger than its Dipper neighbors.'
      }
    }
  },

  cassiopeia: {
    origin: 'In Greek myth, the vain queen of Ethiopia, chained to her throne and circling the pole as a punishment. Cassiopeia is circumpolar for most northern observers, so it was watched every night, all year.',
    modern: 'Its W (or M) shape sits opposite the Big Dipper across Polaris, so at least one of them is always high in the sky.',
    objects: [
      ['Tycho’s Supernova, SN 1572', 'In November 1572 a “new star” as bright as Venus appeared here. Tycho Brahe’s careful measurement showed it had no parallax, so it was far beyond the Moon, breaking the idea that the heavens never change.'],
      ['Cassiopeia A', 'The strongest radio source beyond the solar system was found in 1947–48, and its optical remnant in 1950. It is the debris of a supernova from about 1680 that was barely, if at all, recorded. Its gas is rich in oxygen, silicon, sulfur and iron, seeded freshly into space. Chandra’s first light image (1999) revealed a neutron star at its heart.'],
      ['Open clusters', 'M52 and M103 lie in the Milky Way band here, along with the Bubble Nebula (NGC 7635).']
    ],
    tidbits: [
      'Cassiopeia shows why supernova remnants matter for chemistry: the oxygen in your blood and the iron in your hemoglobin came from explosions like the one that made Cas A.',
      'Apollo 1 astronaut Gus Grissom nicknamed Gamma Cas “Navi” (his middle name Ivan, reversed), and some star lists still use it.',
      'The Milky Way’s band runs through the W, which is why binoculars are so rewarding here.'
    ],
    stars: {
      'Schedar': {
        bayer: 'α Cassiopeiae', spec: 'K0 II–III · ~4,500 K',
        history: 'From Arabic “breast.” It is a slightly variable orange giant.',
        physics: 'Strong neutral-metal lines; about 40 times the Sun’s radius and several hundred times its luminosity.'
      },
      'Caph': {
        bayer: 'β Cassiopeiae', spec: 'F2 III–IV · ~6,900 K',
        history: 'From Arabic “the stained hand.” It lies almost exactly at right ascension 0h, the sky’s “prime meridian.”',
        physics: 'A delta Scuti variable: it pulsates in a 2.5-hour cycle, and its spectrum shows the pulsation as tiny periodic shifts in its lines.'
      },
      'Gamma Cas': {
        bayer: 'γ Cassiopeiae', spec: 'B0.5 IVpe · ~25,000 K',
        history: 'In 1866 Angelo Secchi saw bright hydrogen emission in its spectrum, the first “Be” star ever recognized.',
        physics: 'A fast spinner near breakup speed, surrounded by a disk of gas it has flung off. It also emits unusually hard X-rays for its class, still not fully explained.'
      },
      'Ruchbah': {
        bayer: 'δ Cassiopeiae', spec: 'A5 III–IV · ~8,200 K',
        history: 'From Arabic “knee.” It is an eclipsing binary of the Algol type (the eclipse repeats about every 759 days).',
        physics: 'Its dips in brightness come from one star passing in front of the other. That is direct evidence of a binary orbit from light alone.'
      },
      'Segin': {
        bayer: 'ε Cassiopeiae', spec: 'B3 III · ~15,000 K',
        history: 'The faintest of the five W stars, at the end of the W.',
        physics: 'A blue-white giant tens of millions of years old, thousands of times the Sun’s luminosity.'
      }
    }
  },

  cygnus: {
    origin: 'The Swan (Greek Kyknos). Some myths place Zeus disguised as a swan; another has Orpheus’s soul turned into a swan after death, placed next to his lyre (Lyra).',
    modern: 'Cygnus flies along the Milky Way, and its long axis is also called the Northern Cross. Deneb, Vega and Altair form the Summer Triangle.',
    objects: [
      ['Cygnus X-1', 'An X-ray source found by rocket in 1964 and tied to the blue supergiant HDE 226868 in 1971. It became the first widely accepted black hole. Stephen Hawking bet against it in 1974, conceding in 1990. Radio measurements now give it about 21 solar masses, roughly 7,200 ly away.'],
      ['61 Cygni', 'In 1838 Friedrich Bessel measured its parallax (about 10.3 ly, versus the modern 11.4), the first reliable distance to any star other than the Sun. It was chosen because its large proper motion hinted it was near.'],
      ['Veil Nebula', 'Discovered by William Herschel in 1784. It is the wispy remnant of a supernova roughly 20,000 years old, glowing with oxygen, hydrogen and sulfur.'],
      ['North America Nebula (NGC 7000)', 'Found by William Herschel in 1786, a huge glowing hydrogen cloud lit by a hot star near Deneb.'],
      ['Kepler field', 'NASA’s Kepler mission (2009–2013) stared at a patch of Cygnus and found thousands of planets by their transits, including the first Earth-sized planets in a habitable zone.']
    ],
    tidbits: [
      'The spectral signature “P Cygni profile,” an emission line with an absorption trough beside it (from an outflowing wind), is named for P Cygni, a star that flared in 1600.',
      'Albireo’s colors (gold and blue) are a visual example of stellar temperature: the pair is about 4,400 K and 13,000 K.',
      'Deneb is more than 100,000 times the Sun’s luminosity, so we see it clearly across some 2,600 ly.'
    ],
    stars: {
      'Deneb': {
        bayer: 'α Cygni', spec: 'A2 Ia · ~8,500 K',
        history: 'From Arabic dhanab, “tail.” It is the prototype of the Alpha Cygni class of pulsating supergiants.',
        physics: 'A white supergiant of about 19 solar masses with strongly broadened hydrogen lines. Its surface is enriched in nitrogen, evidence of internal mixing. It will end as a supernova.'
      },
      'Sadr': {
        bayer: 'γ Cygni', spec: 'F8 Ib · ~5,700 K',
        history: 'Arabic for “chest.” It sits in a huge cloud of glowing gas, IC 1318.',
        physics: 'A yellow-white supergiant, cooler than Deneb, whose spectrum shows both hydrogen and prominent ionized metals.'
      },
      'Gienah': {
        bayer: 'ε Cygni', spec: 'K0 III · ~4,700 K',
        history: 'Arabic for “wing.” At 72 ly, it is the nearest star in the figure to us.',
        physics: 'An orange giant. Note the contrast with Deneb, about 35 times more distant yet far brighter.'
      },
      'Delta Cygni': {
        bayer: 'δ Cygni', spec: 'B9 III · ~10,000 K',
        history: 'A visual double star that also has a close companion (a spectroscopic binary).',
        physics: 'A blue-white giant; the eastern wing of the Swan.'
      },
      'Albireo': {
        bayer: 'β Cygni', spec: 'K3 II + B8 V · ~4,400 K / ~13,000 K',
        history: 'The name’s origin is a garbled medieval translation. Its two stars separate in small telescopes.',
        physics: 'The gold star is a K3 supergiant and its blue companion a hot B8 dwarf. Recent Gaia data suggest the pair is probably bound, with an orbit of many thousands of years.'
      }
    }
  },

  aries: {
    origin: 'The Ram of the Golden Fleece in Greek myth. In Babylonian MUL.APIN (about 1000 BCE) this region is “the Hired Man.”',
    modern: 'About 2,000 years ago the Sun crossed the celestial equator here at the spring equinox, so Aries began the zodiac. Precession has since moved that point into Pisces; the symbol ♈ and the “First Point of Aries” remain as names.',
    objects: [
      ['Gamma Arietis (Mesarthim)', 'Robert Hooke found this equal double star in 1664 while following a comet, one of the earliest telescopic doubles.'],
      ['Hamal b', 'A giant planet was reported around Hamal in 2011 with about 1.8 Jupiter masses and a 380-day orbit.']
    ],
    tidbits: [
      'Aries is compact and faint, yet it has been a calendar marker since Babylonian times.',
      'The Sun is in Aries’s official IAU region from about April 19 to May 13, which is later than “the sign of Aries” in astrology, because the sky has shifted since those signs were fixed.'
    ],
    stars: {
      'Hamal': {
        bayer: 'α Arietis', spec: 'K2 III · ~4,480 K',
        history: 'From Arabic ra’s al-ḥamal, “head of the ram.”',
        physics: 'An orange giant about 15 times the Sun’s radius, with a planet candidate confirmed by radial-velocity shifts in its lines.'
      },
      'Sheratan': {
        bayer: 'β Arietis', spec: 'A5 V · ~8,000 K',
        history: 'From Arabic “the two signs,” a reference to the equinox that once began here.',
        physics: 'A spectroscopic binary: its lines split and merge with a period of about 107 days.'
      },
      'Mesarthim': {
        bayer: 'γ Arietis', spec: 'A1 V + A1 V · ~9,000 K',
        history: 'Discovered as a double by Robert Hooke in 1664.',
        physics: 'Two near-identical white stars; one is a chemically peculiar star with enhanced silicon.'
      },
      'Botein': {
        bayer: 'δ Arietis', spec: 'K2 III · ~4,200 K',
        history: 'The name’s Arabic origin is debated, perhaps “the little belly.”',
        physics: 'An orange giant similar to Hamal.'
      }
    }
  },

  taurus: {
    origin: 'Among the oldest recognized: the Bull of Heaven in Mesopotamia (Gilgamesh), and a bull in Greek myth. Some researchers propose that Lascaux’s cave bulls (about 17,000 years ago) show the Pleiades, and the Nebra Sky Disc (about 1600 BCE) shows them clearly.',
    modern: 'The Sun crossed the equator in Taurus around 4000–1700 BCE, which may explain the bull’s prominence in early religions; today the June solstice falls here.',
    objects: [
      ['Crab Nebula (M1)', 'The debris of a supernova recorded by Chinese astronomers on July 4, 1054 as a “guest star,” visible in daylight for weeks. Bevis found the nebula in 1731; Messier catalogued it as No. 1 in 1758 while hunting comets.'],
      ['Crab Pulsar', 'Discovered in 1968: a neutron star spinning 30 times a second, the leftover core of the 1054 event. It proved that supernovae make neutron stars.'],
      ['Pleiades (M45)', 'Galileo counted 36 stars with his telescope in 1610. The cluster is about 100 million years old and about 444 ly away; its blue nebulosity is starlight reflecting off dust.'],
      ['Hyades', 'The nearest open cluster, about 153 ly away. Its stars share a common motion, used to calibrate distances across the galaxy by the “moving cluster” method.'],
      ['T Tauri', 'Found in 1852 by John Russell Hind; it is the prototype of young, still-contracting stars.']
    ],
    tidbits: [
      'Aldebaran is not in the Hyades: it sits 67 ly away while the cluster is 153 ly away. It only lines up from our viewpoint.',
      'Pioneer 10 is heading in Aldebaran’s general direction. It would take about 2 million years to pass by.',
      'Elnath was once shared with Auriga, as “Gamma Aurigae”; the 1930 IAU boundaries gave it to Taurus.'
    ],
    stars: {
      'Aldebaran': {
        bayer: 'α Tauri', spec: 'K5 III · ~3,900 K',
        history: 'From Arabic “the follower” (of the Pleiades). It was one of the four Royal Stars of Persia. In 1864 Huggins and Miller measured its spectrum, finding sodium, magnesium, calcium and iron.',
        physics: 'An orange giant about 44 times the Sun’s radius. Its light is dominated by neutral metal lines and molecular bands.'
      },
      'Elnath': {
        bayer: 'β Tauri', spec: 'B7 III · ~13,600 K',
        history: 'From Arabic “the butting one.”',
        physics: 'A mercury-manganese (HgMn) star: its surface shows unusually strong mercury and manganese lines, because the heavy elements are held up by radiation while others sink.'
      },
      'Tianguan': {
        bayer: 'ζ Tauri', spec: 'B1 IVe · ~22,000 K',
        history: 'Chinese “Heavenly Gate.” It lies about 1° from the Crab Nebula.',
        physics: 'A close binary with a Be-type gas disk.'
      },
      'Ain': {
        bayer: 'ε Tauri', spec: 'G9.5 III · ~4,900 K',
        history: 'Arabic for “eye.” In 2007 Ain became the first star in an open cluster confirmed to host a planet.',
        physics: 'A Hyades giant; its planet, Ain b, has about 7.6 Jupiter masses.'
      },
      'Hyadum I': {
        bayer: 'γ Tauri', spec: 'G8 III · ~4,900 K',
        history: 'The tip of the Hyades “V.”',
        physics: 'A yellow-orange giant evolved from a star of about 2.5 solar masses.'
      },
      'Hyadum II': {
        bayer: 'δ Tauri', spec: 'G8 III · ~5,000 K',
        history: 'Part of the Hyades cluster.',
        physics: 'A giant of the same age as its cluster siblings, about 625 million years.'
      }
    }
  },

  gemini: {
    origin: 'Castor and Pollux, twin sons of Leda (Greek myth); Babylonians saw the Great Twins. Gemini is the Latin word for twins.',
    modern: 'The December solstice Sun lay in Gemini around 1000 BCE; the Sun now crosses it in June.',
    objects: [
      ['Uranus', 'On March 13, 1781, William Herschel spotted a “comet” near Eta Geminorum. It was Uranus, the first planet found by telescope, and doubled the size of the known solar system.'],
      ['Pluto', 'Clyde Tombaugh found it in Gemini in February 1930 by comparing photographic plates taken near Delta Geminorum.'],
      ['Geminid meteors', 'The strongest annual shower (peaking around December 13–14) comes from the asteroid 3200 Phaethon, found in 1983.'],
      ['Other objects', 'M35 open cluster and the Eskimo Nebula (NGC 2392).']
    ],
    tidbits: [
      'Castor and Pollux are not related by the sky: Pollux is 34 ly away, Castor is 51 ly. They are a neighbor pair only from our view.',
      'Castor is a sextuple system: three pairs of stars, all bound together.'
    ],
    stars: {
      'Castor': {
        bayer: 'α Geminorum', spec: 'A1 V + A2 Vm · ~10,000 K',
        history: 'Cassini resolved it as a double in 1678. In 1803 William Herschel proved the two stars orbit each other, the first evidence of gravitationally bound double stars beyond the solar system. Spectroscopy in 1896–1920 showed each is itself a pair, and found a third eclipsing pair (YY Geminorum).',
        physics: 'Six stars in three pairs, all orbiting a common center, with the outer pair taking many centuries to complete an orbit.'
      },
      'Pollux': {
        bayer: 'β Geminorum', spec: 'K0 III · ~4,600 K',
        history: 'The brighter twin, despite Beta. In 2006 astronomers confirmed a planet, Pollux b (later named Thestias), with about 2.3 Jupiter masses.',
        physics: 'The nearest giant star to Earth: an ageing orange giant with strong neutral-metal lines.'
      },
      'Alhena': {
        bayer: 'γ Geminorum', spec: 'A1.5 IV · ~9,200 K',
        history: 'From Arabic “the brand” (a mark on a camel’s neck).',
        physics: 'A white subgiant, a spectroscopic binary.'
      },
      'Wasat': {
        bayer: 'δ Geminorum', spec: 'F0 IV · ~6,900 K',
        history: 'Arabic “middle.” It lies almost on the ecliptic; Pluto was discovered close by.',
        physics: 'A binary with a very faint companion.'
      },
      'Mebsuta': {
        bayer: 'ε Geminorum', spec: 'G8 Ib · ~4,400 K',
        history: 'From Arabic “the outstretched paw.”',
        physics: 'A yellow supergiant far more luminous than it appears; it is 870 ly away.'
      },
      'Mekbuda': {
        bayer: 'ζ Geminorum', spec: 'F7 Ib–G3 Ib · ~5,700 K',
        history: 'A classical Cepheid with a period of about 10.15 days. Henrietta Leavitt’s 1912 period–luminosity relation for Cepheids let astronomers turn such pulsation periods into distances.',
        physics: 'The star swells and shrinks by about 10% as it pulsates; its spectral type changes over the cycle.'
      },
      'Tejat': {
        bayer: 'μ Geminorum', spec: 'M3 III · ~3,600 K',
        history: 'From Arabic for “the foot.”',
        physics: 'A red giant with TiO bands, slightly variable.'
      },
      'Propus': {
        bayer: 'η Geminorum', spec: 'M3 III · ~3,600 K',
        history: 'A variable star found by Julius Schmidt in 1865. Herschel’s discovery of Uranus happened only a few degrees away.',
        physics: 'A semi-regular variable red giant in a multiple system.'
      }
    }
  },

  cancer: {
    origin: 'The Crab that Hera sent to pinch Heracles’s foot during the fight with the Hydra. Babylonian astronomers called it the Crayfish or the Turtle.',
    modern: 'The faintest zodiac constellation, but it gave the Tropic of Cancer its name: about 2,000 years ago the June solstice Sun stood here.',
    objects: [
      ['Beehive Cluster (M44, Praesepe)', 'A naked-eye smudge known since antiquity; Ptolemy called it a “nebulous mass.” Galileo resolved it into about 40 stars in 1609. It is about 600 million years old and roughly 600 ly away. Ancient farmers used its disappearance in haze as a rain omen.'],
      ['55 Cancri', 'A planet was found in 1996, and 55 Cnc e (a “lava world” super-Earth) was later caught in transit. In 2015 the IAU named the star Copernicus, planet b Galileo, and planet c Brahe.'],
      ['Asellus stars', 'The two “donkey colts” (Gamma and Delta) bracket the Beehive, in the myth of the donkeys that helped Dionysus.']
    ],
    tidbits: [
      'The Beehive lets you see stellar aging directly: its red giants and white dwarfs are far from where they started.',
      'Cancer is so faint that a city sky can erase it; the Beehive is the easiest guide.'
    ],
    stars: {
      'Tarf': {
        bayer: 'β Cancri', spec: 'K4 III · ~4,000 K',
        history: 'From Arabic “the end (of the leg).”',
        physics: 'The brightest star in Cancer despite its Beta name, an orange giant with a faint companion.'
      },
      'Acubens': {
        bayer: 'α Cancri', spec: 'A5 m · ~7,900 K',
        history: 'From Arabic “the claw.”',
        physics: 'A metallic-line (Am) star whose spectrum shows unusually strong metal lines, a result of slow rotation that lets elements settle or rise.'
      },
      'Asellus Borealis': {
        bayer: 'γ Cancri', spec: 'A1 IV · ~9,900 K',
        history: 'Latin for “northern donkey colt.”',
        physics: 'A white subgiant on the north side of the Beehive.'
      },
      'Asellus Australis': {
        bayer: 'δ Cancri', spec: 'K0 III · ~4,500 K',
        history: 'Latin for “southern donkey colt.” It lies within a degree of the ecliptic.',
        physics: 'An orange giant, a probable member of the Beehive’s stellar family.'
      },
      'Iota Cancri': {
        bayer: 'ι Cancri', spec: 'G8 II + A3 V',
        history: 'A visual double that shows contrasting colors in small telescopes.',
        physics: 'A yellow bright giant paired with a white main-sequence star, a temperature contrast of several thousand kelvin.'
      }
    }
  },

  leo: {
    origin: 'The Lion appears in Babylonian records as UR.GU.LA, and in Greek myth as the Nemean lion killed by Heracles. Its long association with the summer solstice, when the Sun stood here, tied the lion to heat and kingship.',
    modern: 'Leo’s Sickle traces the mane; the triangle at the east forms the haunch and tail.',
    objects: [
      ['Leonid meteors', 'The 1833 storm (tens of thousands of meteors per hour or more) and 1966 storm followed the orbit of comet 55P/Tempel–Tuttle. Schiaparelli’s 1866 link between showers and comets showed that meteor showers are comet debris.'],
      ['Leo Triplet', 'M65 and M66 (Méchain, 1780) and NGC 3628 are three spiral galaxies about 35 million ly away.'],
      ['Wolf 359', 'One of the nearest stars, 7.9 ly away in Leo, a faint red dwarf found by Max Wolf in 1918 through its large proper motion.'],
      ['Leo I', 'A dwarf satellite of the Milky Way, found in 1950 on the Palomar Sky Survey plates.']
    ],
    tidbits: [
      'Regulus is only about half a degree from the ecliptic, so the Moon and planets often pass close to it or in front of it.',
      'Regulus spins so fast (a rotation every 16 hours) that it is squashed into an oval and would break up at only slightly higher speed.'
    ],
    stars: {
      'Regulus': {
        bayer: 'α Leonis', spec: 'B8 IVn · ~12,000 K',
        history: 'Latin “little king,” a name popularized by Copernicus. It was one of the four Royal Stars of Persia. It is a quadruple system.',
        physics: 'The “n” in its class marks nebulous (broadened) lines from rapid rotation: a rotation speed near 96% of breakup. Interferometry in 2005 showed the star is 32% wider at its equator than pole to pole.'
      },
      'Algieba': {
        bayer: 'γ Leonis', spec: 'K1 III + G7 III',
        history: 'Herschel measured its two stars in 1782; they orbit every 500 years or so.',
        physics: 'Two orange-yellow giants, among the easiest colored doubles to see in a telescope.'
      },
      'Adhafera': {
        bayer: 'ζ Leonis', spec: 'F0 III · ~6,900 K',
        history: 'From Arabic “the braid,” for the lion’s mane.',
        physics: 'A yellow-white giant forming the top of the Sickle.'
      },
      'Ras Elased': {
        bayer: 'ε Leonis', spec: 'G1 II · ~5,700 K',
        history: 'Arabic “head of the lion.”',
        physics: 'A yellow bright giant, close to the Sun’s temperature but hundreds of times as luminous.'
      },
      'Denebola': {
        bayer: 'β Leonis', spec: 'A3 V · ~8,500 K',
        history: 'Arabic “tail of the lion.” In the 1980s the IRAS satellite found infrared light coming from a ring of dust orbiting it.',
        physics: 'A white main-sequence star about 36 ly away, far younger than the Sun.'
      },
      'Zosma': {
        bayer: 'δ Leonis', spec: 'A4 V · ~8,300 K',
        history: 'From Greek for “girdle.”',
        physics: 'A white main-sequence star on the lion’s back.'
      },
      'Chertan': {
        bayer: 'θ Leonis', spec: 'A2 V · ~9,000 K',
        history: 'From Arabic “the two ribs.”',
        physics: 'A white main-sequence star at the lion’s rear haunch.'
      }
    }
  },

  virgo: {
    origin: 'A maiden holding an ear of grain (Spica, “the ear of wheat”), identified with Demeter, Astraea or Persephone. Babylonians saw the Furrow (with Spica as its grain).',
    modern: 'The second-largest constellation, and the one the Sun spends the longest crossing, about six weeks.',
    objects: [
      ['Virgo Cluster', 'A cluster of over a thousand galaxies about 54 million ly away, found piece by piece by Messier in the 1770s–80s. The Milky Way is part of the same larger Local Supercluster.'],
      ['M87', 'In 1918 Heber Curtis saw a “curious straight ray” from this giant galaxy, the first observed jet. In April 2019 the Event Horizon Telescope imaged the black hole at its center, about 6.5 billion solar masses.'],
      ['3C 273', 'In 1963 Maarten Schmidt showed that this “star” has a redshift of 0.158, putting it billions of light-years away: the first quasar identified.'],
      ['Sombrero Galaxy (M104)', 'Found by Méchain in 1781.']
    ],
    tidbits: [
      'About 127 BCE, Hipparchus compared Spica’s position with older Babylonian and Greek records and found it had moved by about 2° relative to the equinox. He had discovered precession, the 26,000-year wobble of Earth’s axis.',
      'Vindemiatrix rose in the dawn in late summer, telling farmers that grapes were ready: its Latin name means “grape gatherer.”'
    ],
    stars: {
      'Spica': {
        bayer: 'α Virginis', spec: 'B1 III–IV + B2 V · ~25,000 K',
        history: 'The star that revealed precession: Hipparchus, about 127 BCE. Some scholars propose that ancient temples were aligned to its rising.',
        physics: 'Two hot blue stars orbiting only 18 million km apart every four days, so tightly that gravity distorts them into egg shapes and the brightness varies slightly. Their combined luminosity is roughly 12,000 Suns.'
      },
      'Porrima': {
        bayer: 'γ Virginis', spec: 'F0 V + F0 V · ~7,000 K',
        history: 'A famous binary with a period of about 169 years; the two stars closed to their minimum separation in 2005 and looked like one star in small telescopes.',
        physics: 'Two nearly identical yellow-white stars, each a little hotter and brighter than the Sun.'
      },
      'Vindemiatrix': {
        bayer: 'ε Virginis', spec: 'G8 III · ~5,000 K',
        history: 'The “grape gatherer”: its dawn rising signalled the grape harvest.',
        physics: 'A yellow giant with a rich lines-of-neutral-metals spectrum.'
      },
      'Heze': {
        bayer: 'ζ Virginis', spec: 'A3 V · ~8,500 K',
        history: 'A white star in the Maiden’s arm.',
        physics: 'A white main-sequence star about 75 ly away.'
      },
      'Zaniah': {
        bayer: 'η Virginis', spec: 'A2 IV · ~9,000 K',
        history: 'From Arabic “the corners.”',
        physics: 'A white multiple-star system.'
      },
      'Zavijava': {
        bayer: 'β Virginis', spec: 'F9 V · ~6,100 K',
        history: 'From Arabic “the corner of the barking dog.”',
        physics: 'A Sun-like star just 36 ly away. It is one of the nearest Sun-like stars visible to the naked eye, so it is a favorite target for planet searches.'
      }
    }
  },

  libra: {
    origin: 'Babylonian astronomers already pictured this region as a balance (zibanitu) around 1000 BCE. Greeks called it the Claws (Chelae) of the Scorpion; Romans restored the Scales in the age of Julius Caesar.',
    modern: 'The only zodiac figure that is an object, not a creature. The Sun crossed the autumn equinox here in ancient times.',
    objects: [
      ['Gliese 581', 'A red dwarf 20 ly away. In 2007 astronomers announced Gliese 581 c, an early super-Earth candidate near the habitable zone, which energized the search for habitable worlds.'],
      ['Zubeneschamali', 'Some observers have described this star as faintly green, which is unusual for a star. Physically it is blue-white; the report is a fascinating debate about human color perception.']
    ],
    tidbits: [
      'Libra’s alpha and beta names, “southern claw” and “northern claw,” are a fossil of the older Scorpion’s-claws figure.',
      'Libra has no star brighter than magnitude 2.6, which is why it is easy to miss.'
    ],
    stars: {
      'Zubenelgenubi': {
        bayer: 'α Librae', spec: 'A3 IV + F4 IV · ~8,000 K',
        history: 'A wide naked-eye double, about 76 ly away. It is named “southern claw” because it belonged to the Scorpion.',
        physics: 'Two stars that are possibly a physical pair, very widely separated.'
      },
      'Zubeneschamali': {
        bayer: 'β Librae', spec: 'B8 V · ~12,000 K',
        history: 'Its name means “northern claw.” Historic reports of a green color have never been confirmed.',
        physics: 'A blue-white dwarf that spins fast (about 250 km/s), so its lines are broad.'
      },
      'Zubenelhakrabi': {
        bayer: 'γ Librae', spec: 'G8.5 III · ~4,900 K',
        history: 'Arabic for “the scorpion’s claw.” Planets were reported around it in 2010.',
        physics: 'An orange-yellow giant.'
      },
      'Brachium': {
        bayer: 'σ Librae', spec: 'M2.5 III · ~3,600 K',
        history: 'Latin for “arm.”',
        physics: 'A cool red giant, slightly variable.'
      }
    }
  },

  scorpius: {
    origin: 'One of the few constellations that really looks like its animal. Greek myth says Artemis or Gaia sent it to kill Orion; in Polynesian tradition the curve is Maui’s fish-hook.',
    modern: 'Scorpius sits on the ecliptic and its tail dips into the Milky Way’s bright core region.',
    objects: [
      ['Scorpius X-1', 'In 1962 a rocket by Riccardo Giacconi’s team found the first X-ray source outside the solar system here: a neutron star pulling gas from a companion. Giacconi shared the 2002 Nobel Prize in Physics.'],
      ['Ptolemy’s Cluster (M7)', 'Ptolemy described it around 130 CE; M6 (the Butterfly Cluster) lies beside it.'],
      ['M4', 'A globular cluster found by Philippe Loys de Chéseaux in 1746 near Antares, about 6,000 ly away.'],
      ['Scorpius OB1', 'A group of hot, young blue stars, born a few million years ago, and the source of Scorpius’s blue-white glow.']
    ],
    tidbits: [
      'Antares means “rival of Mars” (Greek anti-Ares), because both are red.',
      'In July 2000 Delta Scorpii unexpectedly brightened from magnitude 2.3 to 1.6, and it has stayed bright. A companion on a 10.7-year orbit had swung close and disturbed the star’s disk.'
    ],
    stars: {
      'Antares': {
        bayer: 'α Scorpii', spec: 'M1.5 Iab–Ib · ~3,400 K',
        history: 'One of the four Royal Stars of Persia. In 1819 Johann Bürg found its blue companion, Antares B, while watching the Moon pass in front of it.',
        physics: 'A red supergiant about 700 times the Sun’s radius with TiO bands and strong metal lines. Interferometry (2013) mapped huge turbulent gas motions in its atmosphere. The companion’s blue-green look is partly a contrast effect.'
      },
      'Acrab': {
        bayer: 'β Scorpii', spec: 'B1 V + B2 V · ~26,000 K',
        history: 'Its name is Arabic for “scorpion.” It is a multiple star system.',
        physics: 'Hot, blue stars only about ten million years old.'
      },
      'Dschubba': {
        bayer: 'δ Scorpii', spec: 'B0.3 IV · ~28,000 K',
        history: 'A Be star that changed in the year 2000. Its brightness jump was noticed by Sebastian Otero.',
        physics: 'Hydrogen emission lines come from a gas disk that the star sheds; the disk has grown since then.'
      },
      'Fang': {
        bayer: 'π Scorpii', spec: 'B1 V + B2 V · ~27,000 K',
        history: 'Nicknamed for the scorpion’s claw.',
        physics: 'A close binary that eclipses every 1.57 days.'
      },
      'Sargas': {
        bayer: 'θ Scorpii', spec: 'F0 II · ~7,300 K',
        history: 'The name is old, possibly of Sumerian origin.',
        physics: 'A yellow-white bright giant, the second-brightest star in the tail.'
      },
      'Lesath': {
        bayer: 'υ Scorpii', spec: 'B2 IV · ~24,000 K',
        history: 'From Arabic “sting.”',
        physics: 'A hot subgiant in the stinger pair.'
      },
      'Shaula': {
        bayer: 'λ Scorpii', spec: 'B2 IV + B · ~25,000 K',
        history: 'From Arabic “raised (tail).” It is the second-brightest star in Scorpius.',
        physics: 'A triple system with a hot subgiant and two smaller companions.'
      }
    }
  },

  sagittarius: {
    origin: 'The Archer, a centaur-like figure in Greek myth (linked to Chiron or Crotus); Babylonians pictured an archer-centaur, Pabilsag, about 1000 BCE or earlier.',
    modern: 'The Teapot asterism points to the Milky Way’s center, which lies about 26,000 ly away toward Sagittarius A*.',
    objects: [
      ['Sagittarius A*', 'In 1933 Karl Jansky detected the first cosmic radio noise, strongest here. Sgr A* was identified as a compact radio source in 1974. Tracking the star S2 in 16-year orbit showed a 4-million-solar-mass black hole, awarded the 2020 Nobel Prize (Genzel and Ghez). The Event Horizon Telescope imaged it in 2022.'],
      ['The Wow! signal', 'On August 15, 1977 the Big Ear radio telescope recorded a 72-second narrowband burst from this region. It was never repeated.'],
      ['Sagittarius B2', 'A giant molecular cloud near the galactic center where astronomers detected ethyl formate (which gives raspberries their flavor and rum its smell) in 2009, as well as alcohol and amino-acid precursors.'],
      ['Clusters and nebulae', 'M22 (Abraham Ihle, 1665) was the first globular cluster recorded; M8 (Lagoon), M17 (Omega/Swan) and M20 (Trifid) are birth clouds.'],
      ['Sagittarius Dwarf Galaxy', 'Found in 1994 (Ibata, Gilmore and Irwin), a small galaxy currently being torn apart by the Milky Way.']
    ],
    tidbits: [
      'The Milky Way looks brightest here because we are looking toward its dense core, and dust hides most of it in visible light.',
      'Baade’s Window (1946) is a rare gap in the dust that let Walter Baade study stars in the galactic bulge.'
    ],
    stars: {
      'Kaus Australis': {
        bayer: 'ε Sagittarii', spec: 'B9.5 III · ~9,960 K',
        history: 'From Arabic qaws (“bow”) plus Latin australis (“southern”). It is the brightest star in Sagittarius.',
        physics: 'A blue-white giant, about 143 ly away.'
      },
      'Kaus Media': {
        bayer: 'δ Sagittarii', spec: 'K3 IIb · ~4,200 K',
        history: '“Middle of the bow.”',
        physics: 'An orange bright giant.'
      },
      'Kaus Borealis': {
        bayer: 'λ Sagittarii', spec: 'K1 IIIb · ~4,900 K',
        history: '“Northern part of the bow.”',
        physics: 'An orange giant at the lid of the Teapot.'
      },
      'Nunki': {
        bayer: 'σ Sagittarii', spec: 'B2.5 V · ~18,000 K',
        history: 'The name traces to a Babylonian star name, which suggests very old use.',
        physics: 'A hot, massive main-sequence star, about 3,000 times the Sun’s luminosity.'
      },
      'Ascella': {
        bayer: 'ζ Sagittarii', spec: 'A2 III + A4 V · ~9,000 K',
        history: 'Latin for “armpit.” It is a close binary with a period of about 21 years.',
        physics: 'Two white stars in a tight orbit.'
      },
      'Alnasl': {
        bayer: 'γ Sagittarii', spec: 'K0 III · ~4,800 K',
        history: 'Arabic “the arrow point.” It marks the Teapot’s spout.',
        physics: 'An orange giant, at the arrow’s tip.'
      }
    }
  },

  capricornus: {
    origin: 'One of the oldest figures: the goat-fish SUHUR.MASH of Sumer, from at least the 2nd millennium BCE, associated with the god Enki/Ea. Greeks linked it to Pan, who leapt into the Nile with a fish’s tail.',
    modern: 'About 2,000 years ago the December solstice fell here, giving us the Tropic of Capricorn. Precession has since moved the solstice into Sagittarius.',
    objects: [
      ['M30', 'A globular cluster found by Messier in 1764, about 28,000 ly away, which has undergone core collapse.'],
      ['Alpha Capricorni', 'A naked-eye double star whose two components are at very different distances (about 690 ly and 109 ly). They are a line-of-sight pair, a lesson in perspective.']
    ],
    tidbits: [
      'The goat-fish is one of the few hybrid creatures in the zodiac. It shows that constellations preserve myth across thousands of years.',
      'Capricornus is faint but broad; late summer evenings are the best time to look for it.'
    ],
    stars: {
      'Deneb Algedi': {
        bayer: 'δ Capricorni', spec: 'A5 mIII + Am · ~7,300 K',
        history: 'From Arabic “tail of the goat.” In 1927 astronomers found it is an Algol-type eclipsing binary that dims by 0.2 magnitude every 1.02 days.',
        physics: 'A metallic-line (Am) star; at 39 ly it is one of the nearest stars in the figure.'
      },
      'Nashira': {
        bayer: 'γ Capricorni', spec: 'A7 III · ~7,600 K',
        history: 'Arabic “bearer of good news.”',
        physics: 'Listed as a chemically peculiar star: its spectrum reveals unusual surface abundances.'
      },
      'Dabih': {
        bayer: 'β Capricorni', spec: 'K0 II + B8 V',
        history: 'A double star: both pieces can be seen with binoculars.',
        physics: 'An orange bright giant with a fainter blue-white companion; a visible temperature contrast.'
      },
      'Algedi': {
        bayer: 'α Capricorni', spec: 'G8 III (α²) · ~5,000 K',
        history: 'Arabic “the kid.” Seen as a naked-eye double since antiquity.',
        physics: 'α² is a yellow giant at 109 ly; α¹ is a distant supergiant. They are not gravitationally related.'
      },
      'Omega Cap': {
        bayer: 'ω Capricorni', spec: 'M-type giant · ~3,700 K',
        history: 'A red giant at the southern point of the goat.',
        physics: 'Molecular bands from oxides dominate the spectrum.'
      }
    }
  },

  aquarius: {
    origin: 'A figure of the Water-Bearer, associated with Babylonian GU.LA (“the great one”), the god Ea, pouring life-giving water. Greeks identified him as Ganymede, cupbearer of the gods.',
    modern: 'Aquarius is a large, faint figure on the ecliptic; the Sun is here in late winter.',
    objects: [
      ['TRAPPIST-1', 'A cool red dwarf about 40 ly away. In 2016 astronomers found three planets, then seven by 2017, several in the habitable zone. JWST observations in 2023 found that planet b has no thick atmosphere.'],
      ['Gliese 876', 'A red dwarf 15 ly away that hosted the first planet found orbiting an M dwarf (1998) and a planetary resonance.'],
      ['Helix Nebula (NGC 7293)', 'Discovered by Karl Harding in 1824, it is the nearest bright planetary nebula, about 650 ly away, the remnant of a Sun-like star’s death.'],
      ['Saturn Nebula (NGC 7009)', 'Found by William Herschel in 1782.'],
      ['Eta Aquariid meteors', 'Each May Earth crosses the trail of Halley’s Comet, and these meteors radiate from Aquarius.']
    ],
    tidbits: [
      'Sadalmelik (“luck of the king”) and Sadalsuud (“luck of luck”) are both yellow supergiants: rare, luminous stars for such a faint constellation.',
      'Aquarius “pours” toward Fomalhaut in Piscis Austrinus, a young star with a debris ring.'
    ],
    stars: {
      'Sadalmelik': {
        bayer: 'α Aquarii', spec: 'G2 Ib · ~5,300 K',
        history: 'Arabic “the luck of the king.”',
        physics: 'A yellow supergiant with the Sun’s color class but thousands of times the luminosity; it shows both strong metal and Ca II lines.'
      },
      'Sadalsuud': {
        bayer: 'β Aquarii', spec: 'G0 Ib · ~5,600 K',
        history: 'Arabic “the luckiest of the lucky.”',
        physics: 'A yellow supergiant, the brightest in Aquarius; it has a fainter companion.'
      },
      'Sadachbia': {
        bayer: 'γ Aquarii', spec: 'A0 V · ~10,000 K',
        history: 'From Arabic for “lucky stars of the tents.” It is the lead star of the Water Jar, the Y-shaped group beside Sadalmelik.',
        physics: 'A white main-sequence star, spinning fast, with strong hydrogen lines.'
      },
      'Skat': {
        bayer: 'δ Aquarii', spec: 'A3 V · ~9,000 K',
        history: 'The name means “the shin.”',
        physics: 'A white star, in the water stream.'
      },
      'Albali': {
        bayer: 'ε Aquarii', spec: 'A1 V · ~9,600 K',
        history: 'Arabic “the swallower.”',
        physics: 'A white main-sequence star at the west edge of the figure.'
      },
      'Ancha': {
        bayer: 'θ Aquarii', spec: 'G8 III · ~4,900 K',
        history: 'The name’s origin is uncertain; it marks the figure’s hip.',
        physics: 'A yellow-orange giant.'
      },
      'Situla': {
        bayer: 'κ Aquarii', spec: 'K2 III · ~4,400 K',
        history: 'Latin “bucket.”',
        physics: 'An orange giant near the Water Jar.'
      }
    }
  },

  pisces: {
    origin: 'Two fish tied by cords, in Greek myth Aphrodite and Eros escaping Typhon. Babylonians pictured a swallow and a great goddess joined by rope (Kun).',
    modern: 'The Sun crosses the vernal equinox point here: the “First Point of Aries” has drifted into Pisces. It sits near Omega Piscium, about 7° from that star.',
    objects: [
      ['Van Maanen’s Star', 'Found by Adriaan van Maanen in 1917, one of the nearest white dwarfs (14 ly). Its spectrum contains calcium, iron and magnesium, which should sink out of a white dwarf’s atmosphere. That points to rocky debris of a destroyed planet falling in.'],
      ['M74', 'Found by Pierre Méchain in 1780, a face-on spiral galaxy that shows spiral structure clearly.'],
      ['Pisces–Perseus Supercluster', 'One of the largest known structures in our region of the universe.']
    ],
    tidbits: [
      'TX Piscium (19 Psc) is a carbon star: it has more carbon than oxygen, which makes its atmosphere sooty and deep red.',
      'The equinox point moves 1° every 72 years; it will enter Aquarius around the 26th century.'
    ],
    stars: {
      'Alpherg': {
        bayer: 'η Piscium', spec: 'G7 IIIa · ~4,900 K',
        history: 'Its name’s origin is debated.',
        physics: 'The brightest star in Pisces, an orange-yellow giant.'
      },
      'Torcular': {
        bayer: 'ο Piscium', spec: 'G8 III · ~4,900 K',
        history: 'From Latin “wine press.”',
        physics: 'A yellow giant on the northern cord.'
      },
      'Alrescha': {
        bayer: 'α Piscium', spec: 'A0 Vp + A3 V · ~9,500 K',
        history: 'From Arabic “the cord,” the knot joining the fishes. A binary with a very slow orbit that takes many centuries.',
        physics: 'A close pair of white stars; one shows chemical peculiarity.'
      },
      'Omega Psc': {
        bayer: 'ω Piscium', spec: 'F4 IV · ~6,800 K',
        history: 'About 7° from the vernal equinox point.',
        physics: 'A nearby yellow-white star, 108 ly away.'
      },
      'Iota Psc': {
        bayer: 'ι Piscium', spec: 'F7 V · ~6,100 K',
        history: 'A close, Sun-like star about 45 ly away.',
        physics: 'A yellow-white dwarf hotter and a little more massive than the Sun.'
      },
      'Gamma Psc': {
        bayer: 'γ Piscium', spec: 'G9 III · ~4,800 K',
        history: 'Brightest star of the Circlet.',
        physics: 'An old, metal-poor orange giant.'
      },
      'TX Piscium': {
        bayer: '19 Piscium', spec: 'C-N carbon star · ~3,100 K',
        history: 'Bright enough to see with binoculars; a deep red carbon star.',
        physics: 'Its spectrum shows C₂ and CN molecular bands instead of the titanium oxide of ordinary red giants, because dredged-up carbon has overtaken oxygen.'
      }
    }
  }
};
