  function readableInk(el, color) {
    // Black or white, whichever contrasts more with `color` (the target background,
    // not the computed one, which may still be mid-transition).
    var ctx = readableInk.ctx || (readableInk.ctx = document.createElement('canvas').getContext('2d'));
    ctx.fillStyle = '#000'; ctx.fillStyle = color;
    var hex = ctx.fillStyle, m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return;
    var lum = [0, 2, 4].map(function (i) { var v = parseInt(m[1].slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
    el.style.color = (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05) ? '#fff' : '#111';
  }

  (function () {
    /* ── Categories (with high-contrast dark-mode variants) ── */
    const CATS = {
      ak: { label: 'Alkali Metal',     color: '#c0392b', darkColor: '#ff7b6e' },
      ae: { label: 'Alkaline Earth',   color: '#c84b00', darkColor: '#ffa25c' },
      tm: { label: 'Transition Metal', color: '#9a6310', darkColor: '#f4c152' },
      pt: { label: 'Post-Transition',  color: '#1e8449', darkColor: '#5ee38e' },
      ml: { label: 'Metalloid',        color: '#1f6493', darkColor: '#67c1ff' },
      nm: { label: 'Nonmetal',         color: '#1a5276', darkColor: '#76b9ff' },
      ha: { label: 'Halogen',          color: '#7d3c98', darkColor: '#d394f4' },
      ng: { label: 'Noble Gas',        color: '#a52e6d', darkColor: '#ff8cc8' },
      ln: { label: 'Lanthanide',       color: '#117a65', darkColor: '#4be4c6' },
      ac: { label: 'Actinide',         color: '#7e5109', darkColor: '#e2aa54' },
    };

    function isDarkTheme() {
      const html = document.documentElement;
      const lighting = html.dataset.lighting || '';
      const theme = html.dataset.theme || '';
      if (lighting === 'night') return true;
      if (window.ClassroomOSThemeRegistry && theme) {
        return window.ClassroomOSThemeRegistry.isDark(theme);
      }
      return ['vaporwave', 'bark', 'mandelbrot', 'lavalamp'].includes(theme);
    }

    function catColor(cat, forceLight) {
      const meta = CATS[cat] || CATS.tm;
      return (!forceLight && isDarkTheme()) ? meta.darkColor : meta.color;
    }

    /* ── Element data ─────────────────────────────────── */
    /* [z, sym, name, mass, cat, shells[], col, row, description] */
    const EL = [
      [1,'H','Hydrogen',1.008,'nm',[1],1,1,'The lightest and most abundant element in the universe, making up about 75% of all visible matter. It fuels stars through nuclear fusion and is a key ingredient in water (H₂O).'],
      [2,'He','Helium',4.003,'ng',[2],18,1,'The second most abundant element in the universe. So light it escapes Earth\'s gravity into space. Used in balloons, MRI machines, and as a coolant for rocket fuel.'],
      [3,'Li','Lithium',6.941,'ak',[2,1],1,2,'The lightest metal on Earth — light enough to float on water. Powers rechargeable batteries in phones, laptops, and electric vehicles.'],
      [4,'Be','Beryllium',9.012,'ae',[2,2],2,2,'An extremely stiff, lightweight metal used in aerospace and X-ray equipment. Its low density and high stiffness make it ideal for spacecraft structures.'],
      [5,'B','Boron',10.811,'ml',[2,3],13,2,'A tough metalloid used in heat-resistant Pyrex glass, ceramics, and detergents. Boron compounds give fireworks a brilliant green color.'],
      [6,'C','Carbon',12.011,'nm',[2,4],14,2,'The basis of all life on Earth. Depending on arrangement, carbon atoms form soft graphite, brilliant diamond, or the ultra-strong buckminsterfullerene (C₆₀).'],
      [7,'N','Nitrogen',14.007,'nm',[2,5],15,2,'Makes up 78% of the air we breathe. Every amino acid and DNA molecule contains nitrogen. Liquid nitrogen at −196°C is used to freeze and preserve biological samples.'],
      [8,'O','Oxygen',15.999,'nm',[2,6],16,2,'Essential for breathing and combustion. The third most abundant element in the universe. Makes up about 21% of Earth\'s atmosphere and 65% of the human body by mass.'],
      [9,'F','Fluorine',18.998,'ha',[2,7],17,2,'The most reactive and electronegative of all elements. Found in toothpaste (fluoride protects teeth) and non-stick cookware (PTFE/Teflon).'],
      [10,'Ne','Neon',20.180,'ng',[2,8],18,2,'A noble gas that glows bright orange-red in electric discharge tubes — the original "neon sign." Rare on Earth but the fifth most abundant element in the universe.'],
      [11,'Na','Sodium',22.990,'ak',[2,8,1],1,3,'A soft, silvery metal that reacts violently with water. Combined with chlorine it forms table salt (NaCl), essential for flavor and life itself.'],
      [12,'Mg','Magnesium',24.305,'ae',[2,8,2],2,3,'A lightweight structural metal found in smartphones, car parts, and airplane bodies. Burns with a brilliant white flame — used in flares and fireworks.'],
      [13,'Al','Aluminum',26.982,'pt',[2,8,3],13,3,'The most abundant metal in Earth\'s crust. Lightweight, strong, and highly recyclable — used in aircraft, cans, foil, and construction worldwide.'],
      [14,'Si','Silicon',28.086,'ml',[2,8,4],14,3,'The foundation of modern electronics. Silicon semiconductors power every computer chip, solar cell, and smartphone processor on the planet.'],
      [15,'P','Phosphorus',30.974,'nm',[2,8,5],15,3,'Critical for life — forms the backbone of DNA and ATP (the cell\'s energy currency). White phosphorus glows in the dark and ignites spontaneously in air.'],
      [16,'S','Sulfur',32.06,'nm',[2,8,6],16,3,'A bright yellow solid found near volcanoes. Used in fertilizers, rubber vulcanization, and medicine. Responsible for the smell of rotten eggs (H₂S).'],
      [17,'Cl','Chlorine',35.45,'ha',[2,8,7],17,3,'A yellow-green toxic gas used to disinfect drinking water and swimming pools. Combined with sodium it forms completely harmless table salt.'],
      [18,'Ar','Argon',39.948,'ng',[2,8,8],18,3,'The third most abundant gas in Earth\'s atmosphere (about 1%). Used to fill incandescent light bulbs and to create inert atmospheres for welding.'],
      [19,'K','Potassium',39.098,'ak',[2,8,8,1],1,4,'An essential mineral that regulates heartbeat and muscle function in the human body. Bananas are a famous dietary source of potassium.'],
      [20,'Ca','Calcium',40.078,'ae',[2,8,8,2],2,4,'The most abundant mineral in the human body, forming bones and teeth. Also critical for muscle contraction, nerve signaling, and blood clotting.'],
      [21,'Sc','Scandium',44.956,'tm',[2,8,9,2],3,4,'A rare silvery-white metal used in aerospace alloys and sports equipment. Even tiny amounts added to aluminum dramatically increase its strength.'],
      [22,'Ti','Titanium',47.867,'tm',[2,8,10,2],4,4,'As strong as steel but 45% lighter. Highly resistant to corrosion. Used in aircraft engines, medical implants, spacecraft, and bicycle frames.'],
      [23,'V','Vanadium',50.942,'tm',[2,8,11,2],5,4,'A hard metal that strengthens steel for tools and construction. Vanadium flow batteries are promising for large-scale renewable energy storage.'],
      [24,'Cr','Chromium',51.996,'tm',[2,8,13,1],6,4,'Gives stainless steel its resistance to rust. Also responsible for the vivid colors in rubies (red) and emeralds (green).'],
      [25,'Mn','Manganese',54.938,'tm',[2,8,13,2],7,4,'Essential for making steel and aluminum alloys. Also a vital trace mineral involved in human metabolism, bone formation, and antioxidant defense.'],
      [26,'Fe','Iron',55.845,'tm',[2,8,14,2],8,4,'The most commonly used metal on Earth and the main component of our planet\'s core. The iron atom in hemoglobin carries oxygen through our bloodstream.'],
      [27,'Co','Cobalt',58.933,'tm',[2,8,15,2],9,4,'Used in high-strength alloys, rechargeable batteries (lithium cobalt oxide), and blue pigments. An essential component of vitamin B12.'],
      [28,'Ni','Nickel',58.693,'tm',[2,8,16,2],10,4,'Highly corrosion-resistant. Used in stainless steel, coins, and rechargeable batteries. The US 5-cent coin is actually 75% copper and only 25% nickel.'],
      [29,'Cu','Copper',63.546,'tm',[2,8,18,1],11,4,'One of humanity\'s first metals, used for over 10,000 years. The best electrical conductor among common metals — the basis of nearly all electrical wiring.'],
      [30,'Zn','Zinc',65.38,'tm',[2,8,18,2],12,4,'Used to galvanize (coat) steel to prevent rust. An essential trace mineral for immune function and wound healing in the human body.'],
      [31,'Ga','Gallium',69.723,'pt',[2,8,18,3],13,4,'A metal that melts in your hand (melting point 29.8°C). Used in semiconductors, LEDs, and solar panels. Gallium arsenide powers smartphone amplifiers.'],
      [32,'Ge','Germanium',72.63,'ml',[2,8,18,4],14,4,'A semiconductor used in fiber optic cables and infrared optics. Mendeleev predicted its existence before it was discovered — a triumph for the periodic table.'],
      [33,'As','Arsenic',74.922,'ml',[2,8,18,5],15,4,'A toxic metalloid historically used as a poison. Today used in semiconductors, pesticides, and to strengthen lead and copper alloys.'],
      [34,'Se','Selenium',78.971,'nm',[2,8,18,6],16,4,'Conducts electricity better in light than in the dark — useful in solar cells and photocopiers. An essential trace mineral for thyroid function.'],
      [35,'Br','Bromine',79.904,'ha',[2,8,18,7],17,4,'One of only two elements that is liquid at room temperature. A dark reddish-brown, pungent liquid used in flame retardants and water purification.'],
      [36,'Kr','Krypton',83.798,'ng',[2,8,18,8],18,4,'A noble gas used in high-powered lasers and photographic flash lamps. The krypton-86 atom was once the international standard definition of the meter.'],
      [37,'Rb','Rubidium',85.468,'ak',[2,8,18,8,1],1,5,'A soft, silvery alkali metal so reactive it ignites spontaneously in air. Used in atomic clocks that power GPS and internet time synchronization.'],
      [38,'Sr','Strontium',87.62,'ae',[2,8,18,8,2],2,5,'Its compounds burn with a brilliant crimson-red flame — a staple of fireworks and emergency flares. Strontium-90 is a hazardous radioactive fallout product.'],
      [39,'Y','Yttrium',88.906,'tm',[2,8,18,9,2],3,5,'Used in phosphors for LED displays to produce red color, and in YAG lasers used in medicine and manufacturing. Also strengthens aluminum and magnesium alloys.'],
      [40,'Zr','Zirconium',91.224,'tm',[2,8,18,10,2],4,5,'Extremely heat and corrosion-resistant. Used as nuclear reactor fuel rod cladding. Cubic zirconia (ZrO₂) is a popular, affordable diamond simulant.'],
      [41,'Nb','Niobium',92.906,'tm',[2,8,18,12,1],5,5,'Added to steel to produce high-strength structural alloys for pipelines, cars, and buildings. A superconductor at very low temperatures. Most comes from Brazil.'],
      [42,'Mo','Molybdenum',95.96,'tm',[2,8,18,13,1],6,5,'Adds strength and toughness to steel alloys for aircraft and missiles. Also an essential trace element for plant nitrogen fixation, vital for agriculture.'],
      [43,'Tc','Technetium',98,'tm',[2,8,18,13,2],7,5,'The lightest element with no stable isotopes — every form is radioactive. Technetium-99m is the most widely used radiotracer in medical diagnostic imaging.'],
      [44,'Ru','Ruthenium',101.07,'tm',[2,8,18,15,1],8,5,'A hard, rare platinum-group metal used in electrical contacts and as a catalyst. Ruthenium dioxide coatings give titanium extraordinary corrosion resistance.'],
      [45,'Rh','Rhodium',102.906,'tm',[2,8,18,16,1],9,5,'One of the rarest and most expensive metals on Earth. Used in catalytic converters to convert harmful car exhaust gases into less toxic emissions.'],
      [46,'Pd','Palladium',106.42,'tm',[2,8,18,18],10,5,'Can absorb up to 900 times its own volume of hydrogen gas. Used in catalytic converters, electronics, and jewelry. Has recently exceeded the price of gold.'],
      [47,'Ag','Silver',107.868,'tm',[2,8,18,18,1],11,5,'The best electrical and thermal conductor of all elements. Used in electronics, mirrors, and photography. Natural antimicrobial properties make it useful in medicine.'],
      [48,'Cd','Cadmium',112.411,'tm',[2,8,18,18,2],12,5,'A toxic heavy metal used in NiCd rechargeable batteries and as a yellow pigment. It bioaccumulates in food chains and poses serious environmental risks.'],
      [49,'In','Indium',114.818,'pt',[2,8,18,18,3],13,5,'Indium tin oxide (ITO) forms the transparent conductive layer in every touchscreen and LCD display. Indium is rarer than silver and mostly recovered from zinc smelting.'],
      [50,'Sn','Tin',118.710,'pt',[2,8,18,18,4],14,5,'One of the earliest metals used by humans — combined with copper to make bronze. Used to coat steel cans for food preservation and in solder for electronics.'],
      [51,'Sb','Antimony',121.760,'ml',[2,8,18,18,5],15,5,'A brittle metalloid used in flame retardants and lead-acid batteries. Ancient Egyptians used antimony sulfide (stibnite) as kohl eye makeup.'],
      [52,'Te','Tellurium',127.60,'ml',[2,8,18,18,6],16,5,'A rare metalloid used in thin-film solar panels, rewritable DVDs, and to improve metal machinability. Earth\'s crust contains less tellurium than gold.'],
      [53,'I','Iodine',126.904,'ha',[2,8,18,18,7],17,5,'Essential for thyroid hormone production. Iodized salt prevents iodine deficiency disorders affecting 2 billion people worldwide. Also a common antiseptic.'],
      [54,'Xe','Xenon',131.293,'ng',[2,8,18,18,8],18,5,'Used in flash lamps, high-intensity film projector bulbs, and ion thrusters that propel spacecraft. The first noble gas shown to form chemical compounds (1962).'],
      [55,'Cs','Cesium',132.905,'ak',[2,8,18,18,8,1],1,6,'Cesium atomic clocks lose less than 1 second per 300 million years — the most accurate timekeepers ever made. They are the foundation of GPS and internet time.'],
      [56,'Ba','Barium',137.327,'ae',[2,8,18,18,8,2],2,6,'Barium sulfate is swallowed as a "barium meal" to make the digestive tract visible on X-rays. Barium compounds also produce vibrant green colors in fireworks.'],
      [57,'La','Lanthanum',138.905,'ln',[2,8,18,18,9,2],3,9,'The first lanthanide. Used in camera and telescope lenses for exceptional optical clarity. Also used in hybrid car batteries and hydrogen storage materials.'],
      [58,'Ce','Cerium',140.116,'ln',[2,8,18,19,9,2],4,9,'The most abundant rare earth element. Used in catalytic converters, self-cleaning oven linings (CeO₂), and as a yellow/orange colorant in glass and ceramics.'],
      [59,'Pr','Praseodymium',140.908,'ln',[2,8,18,21,8,2],5,9,'Creates ultra-strong neodymium-praseodymium permanent magnets for electric motors and wind turbines. Gives glass and enamel a striking yellow-green color.'],
      [60,'Nd','Neodymium',144.242,'ln',[2,8,18,22,8,2],6,9,'Makes the strongest permanent magnets known. Neodymium magnets are in every set of headphones, hard drive, electric car motor, and MRI machine in the world.'],
      [61,'Pm','Promethium',145,'ln',[2,8,18,23,8,2],7,9,'The only lanthanide with no stable isotopes. Used in nuclear-powered pacemakers and miniature batteries for spacecraft where solar power is unavailable.'],
      [62,'Sm','Samarium',150.36,'ln',[2,8,18,24,8,2],8,9,'Samarium-cobalt magnets withstand much higher temperatures than neodymium magnets — essential for jet engines, military equipment, and high-temperature motors.'],
      [63,'Eu','Europium',151.964,'ln',[2,8,18,25,8,2],9,9,'The most reactive lanthanide. Its unique phosphorescence is used as an anti-counterfeiting feature in euro banknotes and in energy-efficient fluorescent lamps.'],
      [64,'Gd','Gadolinium',157.25,'ln',[2,8,18,25,9,2],10,9,'A key MRI contrast agent that makes blood vessels and tumors visible on scans. Has extraordinary magnetic properties near room temperature.'],
      [65,'Tb','Terbium',158.925,'ln',[2,8,18,27,8,2],11,9,'Produces green phosphorescence in energy-saving fluorescent lamps and color TV screens. Expands and contracts in magnetic fields — a property called magnetostriction.'],
      [66,'Dy','Dysprosium',162.500,'ln',[2,8,18,28,8,2],12,9,'Essential for neodymium magnets to maintain strength at high temperatures, enabling electric vehicles to have powerful, heat-resistant motors.'],
      [67,'Ho','Holmium',164.930,'ln',[2,8,18,29,8,2],13,9,'Has the highest magnetic moment of any natural element. Used in powerful magnets for MRI machines and in lasers for minimally invasive surgery.'],
      [68,'Er','Erbium',167.259,'ln',[2,8,18,30,8,2],14,9,'Erbium-doped fiber amplifiers (EDFAs) are the technology that makes long-distance fiber optic internet possible. Gives glass a distinctive pink-red color.'],
      [69,'Tm','Thulium',168.934,'ln',[2,8,18,31,8,2],15,9,'The least abundant naturally occurring lanthanide. Used in portable X-ray devices and in surgical lasers for precise, minimally invasive medical procedures.'],
      [70,'Yb','Ytterbium',173.045,'ln',[2,8,18,32,8,2],16,9,'Used in the world\'s most precise optical atomic clocks. Could one day detect gravitational waves from colliding black holes. Also used in medical X-ray sources.'],
      [71,'Lu','Lutetium',174.967,'ln',[2,8,18,32,9,2],17,9,'The heaviest and hardest lanthanide. Lutetium oxyorthosilicate crystals are used in PET scanners that detect cancer by imaging radioactive tracers in the body.'],
      [72,'Hf','Hafnium',178.49,'tm',[2,8,18,32,10,2],4,6,'Used in nuclear reactor control rods because it absorbs neutrons extremely well. Intel uses hafnium oxide in modern transistor gates to reduce energy leakage.'],
      [73,'Ta','Tantalum',180.948,'tm',[2,8,18,32,11,2],5,6,'Extraordinarily corrosion-resistant. Used in tiny capacitors inside virtually every smartphone, tablet, and laptop — a critical material for mobile technology.'],
      [74,'W','Tungsten',183.84,'tm',[2,8,18,32,12,2],6,6,'Has the highest melting point of any element (3,422°C). Used in light bulb filaments, X-ray tube anodes, and the tips of ballpoint pens.'],
      [75,'Re','Rhenium',186.207,'tm',[2,8,18,32,13,2],7,6,'One of the rarest elements on Earth. Used in superalloys for jet engine turbine blades that must operate at temperatures above 1,000°C.'],
      [76,'Os','Osmium',190.23,'tm',[2,8,18,32,14,2],8,6,'The densest naturally occurring element. A cube the size of a sugar cube weighs nearly as much as a can of soda. Used in electrical contacts and fountain pen tips.'],
      [77,'Ir','Iridium',192.217,'tm',[2,8,18,32,15,2],9,6,'The most corrosion-resistant metal known. A worldwide layer of iridium-rich clay marks the exact moment 66 million years ago when an asteroid caused mass extinction.'],
      [78,'Pt','Platinum',195.084,'tm',[2,8,18,32,17,1],10,6,'A precious, highly unreactive metal used in catalytic converters, fuel cells, and laboratory equipment. Platinum-based drugs like cisplatin treat several cancers.'],
      [79,'Au','Gold',196.967,'tm',[2,8,18,32,18,1],11,6,'One of the least reactive metals. Its rarity, luster, and resistance to tarnish made gold the global standard for currency and wealth for thousands of years.'],
      [80,'Hg','Mercury',200.592,'tm',[2,8,18,32,18,2],12,6,'The only metal liquid at room temperature. Used in thermometers and barometers, but now recognized as highly toxic to the nervous system and environment.'],
      [81,'Tl','Thallium',204.383,'pt',[2,8,18,32,18,3],13,6,'Extremely toxic — historically used as a "poison of choice" in murders. Today used in heart stress tests (thallium scans) and infrared optical lenses.'],
      [82,'Pb','Lead',207.2,'pt',[2,8,18,32,18,4],14,6,'One of the earliest metals used by humans. Widely used in paint and plumbing pipes until the 20th century, when its severe neurotoxic effects on children were established.'],
      [83,'Bi','Bismuth',208.980,'pt',[2,8,18,32,18,5],15,6,'Forms stunning rainbow-colored staircase crystals. Used in cosmetics, Pepto-Bismol stomach medicine, and as a lead substitute in ammunition and fishing sinkers.'],
      [84,'Po','Polonium',209,'ml',[2,8,18,32,18,6],16,6,'Highly radioactive. Discovered by Marie Curie in 1898 and named after her homeland Poland. Used in anti-static devices and tragically in a 2006 assassination.'],
      [85,'At','Astatine',210,'ha',[2,8,18,32,18,7],17,6,'The rarest naturally occurring element on Earth — at any moment, less than 28 grams exist in the entire crust. Highly radioactive with a half-life of only 8.1 hours.'],
      [86,'Rn','Radon',222,'ng',[2,8,18,32,18,8],18,6,'A colorless, odorless radioactive gas that seeps from rocks and soil into buildings. The second leading cause of lung cancer in the US, after cigarette smoking.'],
      [87,'Fr','Francium',223,'ak',[2,8,18,32,18,8,1],1,7,'The most unstable naturally occurring element and one of the rarest. At any time, only about 20–30 grams exist in Earth\'s entire crust. Decays in minutes.'],
      [88,'Ra','Radium',226,'ae',[2,8,18,32,18,8,2],2,7,'Discovered by Marie and Pierre Curie in 1898. Glows faintly blue from its own intense radioactivity. Once painted on watch dials — causing fatal illness in workers.'],
      [89,'Ac','Actinium',227,'ac',[2,8,18,32,18,9,2],3,10,'The first actinide, giving its name to the series. Glows blue in the dark from intense radioactivity. Actinium-225 is used in targeted alpha-particle cancer therapy.'],
      [90,'Th','Thorium',232.038,'ac',[2,8,18,32,18,10,2],4,10,'A radioactive metal considered a potential fuel for safer nuclear reactors — more abundant than uranium and producing far less long-lived radioactive waste.'],
      [91,'Pa','Protactinium',231.036,'ac',[2,8,18,32,20,9,2],5,10,'One of the rarest and most toxic radioactive elements. Has few practical applications due to its extreme scarcity, radioactivity, and toxicity.'],
      [92,'U','Uranium',238.029,'ac',[2,8,18,32,21,9,2],6,10,'The primary fuel for nuclear power plants, which provide about 10% of the world\'s electricity. Uranium-235 atoms split (fission), releasing enormous energy.'],
      [93,'Np','Neptunium',237,'ac',[2,8,18,32,22,9,2],7,10,'The first transuranic element — made in a lab, not found in nature (in significant amounts). Named after Neptune. Tiny traces form naturally in uranium ores.'],
      [94,'Pu','Plutonium',244,'ac',[2,8,18,32,24,8,2],8,10,'Used in nuclear weapons and as reactor fuel. Plutonium-238 generates heat through radioactive decay, powering the Voyager and New Horizons spacecraft.'],
      [95,'Am','Americium',243,'ac',[2,8,18,32,25,8,2],9,10,'Found in household smoke detectors — a tiny amount of Am-241 ionizes air to detect smoke particles. Named after the Americas where it was first produced.'],
      [96,'Cm','Curium',247,'ac',[2,8,18,32,25,9,2],10,10,'Named after Marie and Pierre Curie. The alpha-particle X-ray spectrometer on Mars rovers uses curium to analyze the elemental composition of Martian rocks.'],
      [97,'Bk','Berkelium',247,'ac',[2,8,18,32,27,8,2],11,10,'Named after Berkeley, California. Has limited uses outside of fundamental nuclear research due to its extreme scarcity and rapid radioactive decay.'],
      [98,'Cf','Californium',251,'ac',[2,8,18,32,28,8,2],12,10,'An intense neutron emitter used to start up nuclear reactors and in portable devices for oil well surveying and cancer treatment.'],
      [99,'Es','Einsteinium',252,'ac',[2,8,18,32,29,8,2],13,10,'Named after Albert Einstein. First discovered in the radioactive debris of the first hydrogen bomb test (Ivy Mike, 1952). No practical applications.'],
      [100,'Fm','Fermium',257,'ac',[2,8,18,32,30,8,2],14,10,'Named after Enrico Fermi, father of the nuclear reactor. Also first found in H-bomb fallout. Too rare and radioactive for any practical application.'],
      [101,'Md','Mendelevium',258,'ac',[2,8,18,32,31,8,2],15,10,'Named after Dmitri Mendeleev, creator of the periodic table. Produced one atom at a time in particle accelerators and decays within hours.'],
      [102,'No','Nobelium',259,'ac',[2,8,18,32,32,8,2],16,10,'Named after Alfred Nobel, inventor of dynamite and founder of the Nobel Prize. Produced in tiny quantities and decays in seconds to minutes.'],
      [103,'Lr','Lawrencium',266,'ac',[2,8,18,32,32,8,3],17,10,'Named after Ernest O. Lawrence, inventor of the cyclotron accelerator. The last actinide, completing the f-block of the periodic table.'],
      [104,'Rf','Rutherfordium',267,'tm',[2,8,18,32,32,10,2],4,7,'The first transactinide, named after Ernest Rutherford who discovered the nucleus. Decays in seconds and is studied only in physics research facilities.'],
      [105,'Db','Dubnium',268,'tm',[2,8,18,32,32,11,2],5,7,'Named after Dubna, Russia. A synthetic element that exists for only a few seconds before decaying into lighter elements.'],
      [106,'Sg','Seaborgium',269,'tm',[2,8,18,32,32,12,2],6,7,'Named after Glenn T. Seaborg, who synthesized 10 new elements and won the Nobel Prize. The first element named after a living person at the time of naming.'],
      [107,'Bh','Bohrium',270,'tm',[2,8,18,32,32,13,2],7,7,'Named after Niels Bohr, pioneer of the atomic model and quantum mechanics. Only a few atoms have ever been created; each decays within seconds.'],
      [108,'Hs','Hassium',277,'tm',[2,8,18,32,32,14,2],8,7,'Named after Hesse, Germany. A synthetic, radioactive element produced in particle accelerators with a half-life measured in seconds.'],
      [109,'Mt','Meitnerium',278,'tm',[2,8,18,32,32,15,2],9,7,'Named after Lise Meitner, physicist who co-discovered nuclear fission. She was controversially excluded from the Nobel Prize awarded for that work.'],
      [110,'Ds','Darmstadtium',281,'tm',[2,8,18,32,32,16,2],10,7,'Named after Darmstadt, Germany. A synthetic element with no known uses outside fundamental research. Half-life ranges from microseconds to minutes.'],
      [111,'Rg','Roentgenium',282,'tm',[2,8,18,32,32,17,2],11,7,'Named after Wilhelm Röntgen, who discovered X-rays. An extremely unstable synthetic element — only a handful of atoms have ever been observed.'],
      [112,'Cn','Copernicium',285,'tm',[2,8,18,32,32,18,2],12,7,'Named after Nicolaus Copernicus. Relativistic effects are so strong in this heavy element that it may behave more like a volatile metal or gas at room temperature.'],
      [113,'Nh','Nihonium',286,'pt',[2,8,18,32,32,18,3],13,7,'Named after "Nihon" (Japan in Japanese), making it the first element discovered in Asia. Officially confirmed and named in 2016.'],
      [114,'Fl','Flerovium',289,'pt',[2,8,18,32,32,18,4],14,7,'Named after the Flerov Laboratory in Russia. Relativistic effects may make it unusually volatile or inert for a group 14 element.'],
      [115,'Mc','Moscovium',290,'pt',[2,8,18,32,32,18,5],15,7,'Named after Moscow Oblast. First synthesized in 2003 by a Russian-American collaboration. Decays in milliseconds into nihonium.'],
      [116,'Lv','Livermorium',293,'pt',[2,8,18,32,32,18,6],16,7,'Named after Lawrence Livermore National Laboratory in California. One of the heaviest elements ever created. Decays almost instantly into flerovium.'],
      [117,'Ts','Tennessine',294,'ha',[2,8,18,32,32,18,7],17,7,'Named after Tennessee, home to Oak Ridge National Laboratory, Vanderbilt, and UT. First synthesized in 2010 and officially named by IUPAC in 2016. Only a handful of atoms have ever been observed.'],
      [118,'Og','Oganesson',294,'ng',[2,8,18,32,32,18,8],18,7,'Named after physicist Yuri Oganessian. The heaviest confirmed element and the only period-7 noble gas. Relativistic models suggest it may be a semiconductor or solid rather than an ordinary gas.'],
    ];

    const PROPERTY_SOURCE_URL = 'https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json';
    const PROPERTY_CACHE_KEY = 'classroomos-periodic-ref-v2';

    const HEATMAPS = {
      none:              { label: 'Category',          tint: 'rgba(0,113,227,0.12)',     unit: '' },
      radius:            { label: 'Atomic radius',     tint: 'hsla(185, 86%, 40%, VAR)', unit: 'pm' },
      ionization:        { label: 'Ionization energy', tint: 'hsla(245, 84%, 56%, VAR)', unit: 'kJ/mol' },
      electronegativity: { label: 'Electronegativity', tint: 'hsla(286, 90%, 54%, VAR)', unit: '' },
      density:           { label: 'Density',           tint: 'hsla(205, 96%, 48%, VAR)', unit: 'g/cm³' },
      melt:              { label: 'Melting point',     tint: 'hsla(18, 92%, 50%, VAR)',  unit: 'K' },
      boil:              { label: 'Boiling point',     tint: 'hsla(340, 88%, 50%, VAR)', unit: 'K' },
      mass:              { label: 'Atomic mass',       tint: 'hsla(156, 82%, 38%, VAR)', unit: 'amu' },
      rarity:            { label: 'Scarcity index',    tint: 'hsla(42, 96%, 48%, VAR)',  unit: '/100' }
    };

    const COMMANDS = [
      { label: 'batteries', note: 'Lithium, cobalt, nickel, and manganese power modern battery chemistry.', symbols: ['Li', 'Co', 'Ni', 'Mn', 'C'] },
      { label: 'balloons', note: 'Helium is the classic lift gas because it is inert and lighter than air.', symbols: ['He'] },
      { label: 'chips', note: 'Silicon, gallium, germanium, copper, and gold connect the computing world.', symbols: ['Si', 'Ga', 'Ge', 'Cu', 'Au'] },
      { label: 'lightbulbs', note: 'Tungsten filaments and argon atmospheres let bulbs run hot without burning up.', symbols: ['W', 'Ar'] },
      { label: 'bones', note: 'Calcium, phosphorus, magnesium, and oxygen build hard mineral structure.', symbols: ['Ca', 'P', 'Mg', 'O'] },
      { label: 'water', note: 'Hydrogen and oxygen combine into one of the most important molecules on Earth.', symbols: ['H', 'O'] },
      { label: 'fireworks', note: 'Strontium, barium, copper, sodium, and magnesium shape fireworks color and brightness.', symbols: ['Sr', 'Ba', 'Cu', 'Na', 'Mg'] },
      { label: 'stainless steel', note: 'Iron, chromium, and nickel make corrosion-resistant structural alloys.', symbols: ['Fe', 'Cr', 'Ni'] },
      { label: 'nuclear', note: 'Uranium, plutonium, thorium, cadmium, and hafnium anchor reactor technology.', symbols: ['U', 'Pu', 'Th', 'Cd', 'Hf'] }
    ];

    const CATEGORY_APPLICATIONS = {
      ak: [{ icon: '🔋', title: 'Reactive power', copy: 'Single valence electrons make these metals energy-rich and easy to ionize.' }],
      ae: [{ icon: '🦴', title: 'Structure', copy: 'These metals strengthen minerals, alloys, and many biological systems.' }],
      tm: [{ icon: '🏗️', title: 'Engineering metal', copy: 'Transition metals dominate tools, wiring, engines, and catalysts.' }],
      pt: [{ icon: '🧰', title: 'Useful alloying', copy: 'Post-transition metals are often soft, conductive, and easy to shape.' }],
      ml: [{ icon: '💻', title: 'Semiconductor bridge', copy: 'Metalloids sit between metals and nonmetals, making electronics possible.' }],
      nm: [{ icon: '🧬', title: 'Life chemistry', copy: 'Nonmetals often build molecules, fuels, biomolecules, and gases.' }],
      ha: [{ icon: '🧪', title: 'Reactive chemistry', copy: 'Halogens are strong oxidizers used in sanitation, lighting, and synthesis.' }],
      ng: [{ icon: '🎈', title: 'Inert atmosphere', copy: 'Noble gases resist bonding and protect other materials from reaction.' }],
      ln: [{ icon: '🧲', title: 'Rare-earth magnetics', copy: 'Lanthanides power magnets, lasers, phosphors, and precision optics.' }],
      ac: [{ icon: '☢️', title: 'Radiation science', copy: 'Actinides dominate nuclear energy, radiotherapy, and isotope research.' }]
    };

    const SOURCE_DEFS = {
      crust:     { label: 'Crust',     icon: 'rock' },
      ocean:     { label: 'Ocean',     icon: 'water' },
      air:       { label: 'Air',       icon: 'gas' },
      life:      { label: 'Life',      icon: 'bio' },
      synthetic: { label: 'Synthetic', icon: 'lab' }
    };
    const SOURCE_ICONS = { rock: '◆', water: '≈', gas: '○', bio: '✚', lab: '⚗' };

    const CATEGORY_EARTH = {
      ak: { sources: ['crust', 'ocean'], forms: ['salts and reactive minerals'], extraction: 'Separated from mineral salts or molten compounds', occurrence: 'Too reactive to occur as pure metal in nature', role: 'Batteries, electrolytes, and industrial chemistry' },
      ae: { sources: ['crust', 'ocean', 'life'], forms: ['carbonates, sulfates, silicates'], extraction: 'Mined from minerals, then refined chemically or electrolytically', occurrence: 'Commonly locked inside rocks, shells, bones, or seawater salts', role: 'Structural minerals, lightweight alloys, and biology' },
      tm: { sources: ['crust'], forms: ['ores, native metals, alloys'], extraction: 'Mined as ore, concentrated, smelted, and refined', occurrence: 'Usually found in oxide, sulfide, or carbonate ores', role: 'Tools, wiring, catalysts, and high-strength alloys' },
      pt: { sources: ['crust'], forms: ['ores, oxides, sulfides, alloys'], extraction: 'Recovered from ores or as byproducts of other metal refining', occurrence: 'Often found dispersed through crustal minerals', role: 'Solder, cans, electronics coatings, and soft alloys' },
      ml: { sources: ['crust'], forms: ['silicates, oxides, sulfides, semiconductors'], extraction: 'Mined from minerals and purified for glass, alloy, or semiconductor use', occurrence: 'Concentrated in specific minerals rather than pure deposits', role: 'Microchips, solar cells, glass, and flame retardants' },
      nm: { sources: ['crust', 'air', 'ocean', 'life'], forms: ['gases, minerals, biomolecules, molecular solids'], extraction: 'Collected from air, mined compounds, water, or biological materials depending on the element', occurrence: 'Often cycles through air, water, rocks, and living systems', role: 'Atmosphere, water, fuels, and organic biomolecules' },
      ha: { sources: ['crust', 'ocean'], forms: ['salts and halide minerals'], extraction: 'Separated from brines, seawater, or halide minerals', occurrence: 'Highly reactive, so natural forms are usually compounds', role: 'Sanitation, salts, polymer chemistry, and optics' },
      ng: { sources: ['air'], forms: ['trace atmospheric gases'], extraction: 'Separated by fractional distillation of liquefied air', occurrence: 'Mostly found as individual atoms in the atmosphere', role: 'Inert shielding, lighting, cryogenics, and lasers' },
      ln: { sources: ['crust'], forms: ['rare-earth minerals such as monazite and bastnasite'], extraction: 'Mined from rare-earth ores, then separated by solvent extraction and ion exchange', occurrence: 'Not usually rare individually, but hard to separate from similar neighbors', role: 'Permanent magnets, phosphors, lenses, and fiber optics' },
      ac: { sources: ['crust', 'synthetic'], forms: ['radioactive minerals, reactor products, accelerator-made atoms'], extraction: 'Recovered from uranium/thorium ores or produced in reactors and accelerators', occurrence: 'Heavy actinides are radioactive; many are synthetic or exist only in trace amounts', role: 'Nuclear fuel, space power, medical isotopes, and research' }
    };

    const ELEMENT_EARTH = {
      H:  { sources: ['ocean', 'air', 'life'], forms: ['water, hydrocarbons, organic molecules'], extraction: 'Produced from water electrolysis or natural gas reforming', occurrence: 'Earth holds most hydrogen bound in water and organic compounds', role: 'Water, fuels, ammonia synthesis, and stars' },
      He: { sources: ['crust', 'air'], forms: ['natural gas deposits, trace atmosphere'], extraction: 'Recovered from helium-rich natural gas fields underground', occurrence: 'Light helium escapes the atmosphere; usable helium comes from radioactive alpha decay trapped underground', role: 'MRI cryogenics, balloons, leak detection, and welding' },
      C:  { sources: ['crust', 'air', 'life'], forms: ['graphite, diamond, carbon dioxide, limestone, living tissue'], extraction: 'Mined as graphite or diamond, and cycled biologically as carbon compounds', occurrence: 'Carbon moves through rocks, air, oceans, and living organisms', role: 'Backbone of organic life, steel, fuels, and diamonds' },
      O:  { sources: ['air', 'ocean', 'crust', 'life'], forms: ['oxygen gas, water, oxides, silicates'], extraction: 'Separated from liquefied air or produced by electrolysis of water', occurrence: 'Most abundant element in Earth’s crust by mass and essential in water and air', role: 'Respiration, ozone shield, combustion, and oxide rocks' },
      Na: { sources: ['ocean', 'crust'], forms: ['halite, seawater salts, sodium minerals'], extraction: 'Produced by electrolysis of molten sodium chloride', occurrence: 'Common in seawater and evaporite salt deposits', role: 'Nerve impulses, table salt, glassmaking, and street lamps' },
      Al: { sources: ['crust'], forms: ['bauxite, aluminosilicate minerals'], extraction: 'Refined from bauxite to alumina, then electrolyzed by the Hall–Héroult process', occurrence: 'Most abundant metal in Earth’s crust, locked in oxide ores', role: 'Aircraft, packaging, power lines, and building frames' },
      Si: { sources: ['crust'], forms: ['quartz, sand, silicate rocks, silicon wafers'], extraction: 'Reduced from silica and purified into crystal ingots for wafers or solar cells', occurrence: 'Second most abundant element in Earth’s crust as silicate minerals', role: 'Semiconductors, glass, concrete, and solar panels' },
      Fe: { sources: ['crust'], forms: ['hematite, magnetite, iron meteorites, steel'], extraction: 'Smelted from iron ore in blast furnaces or direct-reduction systems', occurrence: 'Common in crustal ores and dominant in Earth’s core', role: 'Steel construction, magnets, and oxygen transport in blood' },
      Cu: { sources: ['crust'], forms: ['native copper, chalcopyrite, malachite, copper wiring'], extraction: 'Mined from sulfide and oxide ores, then smelted or leached', occurrence: 'Found in ore bodies and occasionally as native metal', role: 'Electrical wiring, plumbing, motors, and bronze/brass' },
      Au: { sources: ['crust'], forms: ['native gold, placer deposits, quartz veins'], extraction: 'Mined from hard-rock veins or placer sediments, then refined', occurrence: 'Often found as native metal because it resists oxidation', role: 'Corrosion-proof electronics contacts, dentistry, and reserves' },
      Hg: { sources: ['crust'], forms: ['cinnabar ore, liquid metal'], extraction: 'Roasted from cinnabar ore and condensed as liquid metal', occurrence: 'Mostly found as mercury sulfide; volatile and bioaccumulative', role: 'Legacy instruments, switches, and fluorescent discharge lamps' },
      Po: { sources: ['crust'], forms: ['trace decay product inside uranium ores'], extraction: 'Mostly produced artificially by neutron irradiation of bismuth', occurrence: 'Exists naturally only in microscopic traces within uranium decay chains', role: 'Anti-static brushes and compact heat sources' },
      At: { sources: ['crust'], forms: ['vanishingly rare decay product in uranium and thorium ores'], extraction: 'Produced in particle accelerators by bombarding bismuth with alpha particles', occurrence: 'Less than ~30 grams exist in Earth’s entire crust at any moment', role: 'Experimental targeted alpha radiotherapy research' },
      Rn: { sources: ['crust', 'air'], forms: ['radioactive gas seeping from soil and rock'], extraction: 'Not mined; forms continuously from radium decay underground', occurrence: 'Collects in basements and mines over uranium-bearing granite and shale', role: 'Indoor air safety monitoring and geological tracing' },
      Fr: { sources: ['crust'], forms: ['short-lived trace intermediate in actinium decay'], extraction: 'Synthesized in accelerator targets for precision atomic physics', occurrence: 'Rarest natural alkali metal (~20–30 g in the entire crust)', role: 'Fundamental laser-trapping and parity-violation physics' },
      Ra: { sources: ['crust'], forms: ['trace mineral component of pitchblende and uranium ores'], extraction: 'Separated chemically from uranium ore processing residues', occurrence: 'Formed continuously by uranium-238 decay in crustal rocks', role: 'Historical luminescence research and modern alpha isotope generators' },
      Ac: { sources: ['crust', 'synthetic'], forms: ['trace uranium-ore decay product and reactor isotope'], extraction: 'Produced in nuclear reactors from radium-226 or thorium targets', occurrence: 'Occurs naturally in parts per trillion within uranium ores', role: 'Targeted alpha cancer therapy research' },
      Pa: { sources: ['crust'], forms: ['trace mineral component in uranium ores'], extraction: 'Extracted from spent nuclear fuel reprocessing or uranium ore residues', occurrence: 'Exceedingly scarce natural decay product between thorium and uranium', role: 'Radiometric ocean-sediment dating and research' },
      U:  { sources: ['crust'], forms: ['uraninite, carnotite, uranium oxides'], extraction: 'Mined from uranium ores, milled, converted, and enriched', occurrence: 'Naturally radioactive and dispersed through crustal rocks', role: 'Nuclear electricity generation and radiometric dating' },
      Tc: { sources: ['synthetic'], forms: ['fission byproduct and medical generator isotope (Tc-99m)'], extraction: 'Produced inside nuclear reactors and molybdenum-99 generators', occurrence: 'No stable isotopes; virtually all usable technetium is reactor-made', role: 'Medical diagnostic SPECT imaging (~30+ million scans/year)' },
      Pm: { sources: ['synthetic'], forms: ['fission byproduct and miniature radioisotope sources'], extraction: 'Separated from nuclear fission products or neutron-irradiated neodymium', occurrence: 'All isotopes are radioactive; natural traces are vanishingly tiny', role: 'Miniature nuclear batteries and luminous instrument gauges' }
    };

    const ELEMENT_APPLICATIONS = {
      H: [{ icon: '🚀', title: 'Rocket fuel', copy: 'Hydrogen powers fuel cells and high-efficiency propulsion systems.' }],
      He: [{ icon: '🎈', title: 'Party balloon', copy: 'Helium lifts balloons and cools MRI magnets without reacting.' }],
      Li: [{ icon: '📱', title: 'Smartphone battery', copy: 'Lithium-ion chemistry stores a huge amount of energy per kilogram.' }],
      C: [{ icon: '💎', title: 'Diamond and graphite', copy: 'Carbon shifts from pencil graphite to diamond depending on structure.' }],
      O: [{ icon: '🫁', title: 'Breathing and combustion', copy: 'Oxygen keeps metabolism and fire going.' }],
      Si: [{ icon: '💻', title: 'Computer chip', copy: 'Silicon wafers host the transistors inside modern processors.' }],
      P: [{ icon: '🧬', title: 'DNA backbone', copy: 'Phosphorus links the sugar-phosphate rails of DNA and ATP.' }],
      Cl: [{ icon: '🏊', title: 'Pool sanitation', copy: 'Chlorine compounds disinfect water by damaging microbes.' }],
      Fe: [{ icon: '🏗️', title: 'Steel beam', copy: 'Iron is the backbone of structural steel and machinery.' }],
      Co: [{ icon: '🔋', title: 'Battery cathode', copy: 'Cobalt helps stabilize high-energy rechargeable battery chemistry.' }],
      Ni: [{ icon: '🪙', title: 'Stainless and coins', copy: 'Nickel improves corrosion resistance and strength.' }],
      Cu: [{ icon: '⚡', title: 'Electrical wiring', copy: 'Copper moves electric current with very low resistance.' }],
      Ga: [{ icon: '🤲', title: 'Melts in your hand', copy: 'Gallium becomes liquid near room temperature and powers LEDs.' }],
      Br: [{ icon: '🧴', title: 'Liquid halogen', copy: 'Bromine is one of the only elements that is liquid near room temperature.' }],
      Ag: [{ icon: '📷', title: 'Photography and electronics', copy: 'Silver reflects light well and conducts electricity better than any other metal.' }],
      I: [{ icon: '🧂', title: 'Iodized salt', copy: 'Iodine protects thyroid health in tiny but essential doses.' }],
      Xe: [{ icon: '🚀', title: 'Ion thruster', copy: 'Xenon is used as a propellant in spacecraft ion engines.' }],
      Nd: [{ icon: '🎧', title: 'Permanent magnet', copy: 'Neodymium magnets power speakers, motors, and wind turbines.' }],
      W: [{ icon: '💡', title: 'Lightbulb filament', copy: 'Tungsten survives extreme heat without melting.' }],
      Au: [{ icon: '💍', title: 'Corrosion-proof conductor', copy: 'Gold protects contacts and jewelry because it barely reacts.' }],
      Hg: [{ icon: '🌡️', title: 'Liquid metal', copy: 'Mercury stays liquid at room temperature, unlike almost every metal.' }],
      U: [{ icon: '⚛️', title: 'Nuclear fuel', copy: 'Uranium stores enormous energy in its atomic nucleus.' }],
      Pu: [{ icon: '🛰️', title: 'Space power', copy: 'Plutonium isotopes can power spacecraft far from the Sun.' }],
      Am: [{ icon: '🚨', title: 'Smoke detector', copy: 'Americium helps ionization smoke alarms sense combustion particles.' }]
    };

    const PORCELAIN_STORY = {
      kicker: 'Material mystery',
      title: 'China’s porcelain secret crossed continents',
      copy: 'Chinese craftspeople developed proto-porcelain more than three thousand years ago and refined the hard, white, translucent material over many centuries. Its strength came from carefully firing kaolin with mineral-rich porcelain stone; feldspar and related minerals supply potassium, sodium, aluminum, silicon, and oxygen and help the body partly vitrify. Porcelain reached Europe long before Europeans could reproduce true hard-paste porcelain. After generations of costly experiments, the Meissen workshop succeeded in the early 1700s—turning a once-guarded material recipe into Europe’s own “white gold.”',
      source: 'Smithsonian: how porcelain developed',
      url: 'https://asia-archive.si.edu/learn/for-educators/teaching-china-with-the-smithsonian/videos/porcelain/'
    };
    const ELEMENT_STORIES = {
      K: PORCELAIN_STORY,
      Na: PORCELAIN_STORY,
      Al: PORCELAIN_STORY,
      Si: PORCELAIN_STORY,
      O: PORCELAIN_STORY,
      Ga: {
        kicker: 'Tea-table chemistry',
        title: 'The disappearing spoon trick',
        copy: 'Gallium melts at about 29.8°C—cool enough for a cast gallium spoon to look perfectly ordinary at first, then slump into a silvery puddle when it stirs hot tea. The famous prank is really a compact phase-change demonstration: the metal has not vanished or dissolved; the drink simply warmed it past its melting point. Use laboratory gallium only, never an unknown low-melting alloy, because some look-alikes contain toxic lead or cadmium.',
        source: 'University of Toledo: gallium display',
        url: 'https://www.utoledo.edu/nsm/ic/elements/gallium.html'
      },
      Hg: {
        kicker: 'Expedition medicine',
        title: 'Lewis and Clark swallowed mercury medicine',
        copy: 'The Corps of Discovery carried roughly 600 of Dr. Benjamin Rush’s powerful laxative pills. The pills contained calomel, a mercury chloride, and were used so often as a near cure-all that mercury remaining in expedition latrines has helped archaeologists confirm campsite locations. They were not drinking liquid elemental mercury, but they were swallowing a mercury compound—a sharp reminder that accepted medicine in 1803 could be dangerous by modern standards.',
        source: 'National Park Service: medicine on the expedition',
        url: 'https://home.nps.gov/articles/000/medicine-on-the-lewis-and-clark-expedition.htm'
      }
    };

    const PRACTICE_QUESTIONS = [
      { prompt: 'Find the only nonmetal element in Group 1 — it sits above lithium because it has 1 electron.', hint: 'Look at Period 1, Group 1 (atomic number 1).', explain: 'Hydrogen (H, Z=1) is a nonmetal with 1 electron in shell 1.', test: (e) => e.symbol === 'H' },
      { prompt: 'Click either of the two elements that are liquid at room temperature (295 K).', hint: 'One is a silvery transition metal in Period 6; the other is a dark halogen in Period 4.', explain: 'Mercury (Hg, melting point 234 K) and Bromine (Br, melting point 266 K) are the two room-temperature liquids.', test: (e) => e.symbol === 'Hg' || e.symbol === 'Br' },
      { prompt: 'Which element has the highest electronegativity on the entire periodic table?', hint: 'Switch the Property Lens to Electronegativity and look in the upper right (skipping noble gases).', explain: 'Fluorine (F, 3.98) pulls shared electrons harder than any other element.', test: (e) => e.symbol === 'F' },
      { prompt: 'Find the element with the highest melting point (used in lightbulb filaments).', hint: 'Switch Property Lens to Melting point or look in Period 6, Group 6.', explain: 'Tungsten (W, Z=74) melts at 3,695 K (3,422 °C) — higher than any other pure element.', test: (e) => e.symbol === 'W' },
      { prompt: 'Click the Period 3 metalloid that forms the foundation of modern computer chips.', hint: 'Row 3, Group 14 — right between aluminum and phosphorus.', explain: 'Silicon (Si, Z=14) sits on the metalloid staircase in Period 3 and has 4 valence electrons.', test: (e) => e.symbol === 'Si' },
      { prompt: 'Find the Period 4 post-transition metal that melts right in your hand (~303 K).', hint: 'Look right next to zinc and germanium in Period 4, Group 13.', explain: 'Gallium (Ga, Z=31) melts at 302.9 K (29.8 °C) — solid on a table, liquid in a warm palm.', test: (e) => e.symbol === 'Ga' },
      { prompt: 'Click ANY element that has 3 electron shells and 1 valence electron.', hint: '3 shells means Period 3; 1 valence electron means Group 1.', explain: 'Sodium (Na, Z=11) sits at Period 3, Group 1 with shells 2 · 8 · 1.', test: (e) => e.shells.length === 3 && e.col === 1 },
      { prompt: 'Click ANY noble gas (Group 18) with a completely full outer shell.', hint: 'Look along the far-right column (Group 18).', explain: 'Noble gases (He, Ne, Ar, Kr, Xe, Rn) sit in Group 18 with filled valence shells.', test: (e) => e.cat === 'ng' },
      { prompt: 'Find the element whose atoms power both diamond and graphite.', hint: 'Period 2, Group 14 — the basis of organic life.', explain: 'Carbon (C, Z=6) forms 4 covalent bonds, creating soft graphite sheets or hard diamond networks.', test: (e) => e.symbol === 'C' },
      { prompt: 'Click the alkali metal used in today’s phone and EV rechargeable batteries.', hint: 'Top metal in Group 1 (Period 2).', explain: 'Lithium (Li, Z=3) is the lightest metal and carries charge in lithium-ion batteries.', test: (e) => e.symbol === 'Li' },
      { prompt: 'Find the transition metal in Period 4 that carries oxygen in your blood and forms Earth’s core.', hint: 'Period 4, Group 8 (Z=26).', explain: 'Iron (Fe, Z=26) binds oxygen inside hemoglobin and forms the core of Earth.', test: (e) => e.symbol === 'Fe' },
      { prompt: 'Click ANY halogen (Group 17) — reactive nonmetals one electron short of a full shell.', hint: 'Look in Group 17, one column left of the noble gases.', explain: 'Halogens (F, Cl, Br, I, At, Ts) sit in Group 17 with 7 outer electrons.', test: (e) => e.cat === 'ha' },
      { prompt: 'Click the lightest element with NO stable isotopes (predicted by Mendeleev and Moseley as gap Z=43).', hint: 'Look in Period 5, Group 7 (d-block).', explain: 'Technetium (Tc, Z=43) was the first predominantly synthetic element and is used in medical imaging.', test: (e) => e.symbol === 'Tc' },
      { prompt: 'Find the Period 2 gas that makes up ~78% of Earth’s atmosphere.', hint: 'Period 2, Group 15 (atomic number 7).', explain: 'Nitrogen (N, Z=7) makes up 78% of air as N₂ and is essential to amino acids and DNA.', test: (e) => e.symbol === 'N' },
      { prompt: 'Click ANY lanthanide (used in strong magnets, lasers, and phone displays).', hint: 'Look in the upper detached f-block row (57–71).', explain: 'Lanthanides (La–Lu) fill an inner 4f subshell, giving them closely related properties.', test: (e) => e.cat === 'ln' }
    ];

    /* ── DOM Handles ──────────────────────────────────── */
    const grid = document.getElementById('pt-grid');
    const legend = document.getElementById('pt-legend');
    const ctrl = document.getElementById('pt-controls');
    const tempInput = document.getElementById('pt-temp');
    const tempReadout = document.getElementById('pt-temp-readout');
    const tempStateReadout = document.getElementById('pt-temp-state-readout');
    const tempEquiv = document.getElementById('pt-temp-equiv');
    const tempCounts = document.getElementById('pt-temp-counts');
    const tempChips = Array.from(document.querySelectorAll('.pt-temp-chip'));
    const quickSearch = document.getElementById('pt-quick-search');
    const quickLens = document.getElementById('pt-quick-lens');
    const quickTemp = document.getElementById('pt-quick-temp');
    const quickTempBtn = document.getElementById('pt-quick-temp-btn');
    const quickCmd = document.getElementById('pt-quick-cmd');
    const quickControls = document.getElementById('pt-quick-controls');
    const stateCounts = document.getElementById('pt-state-counts');
    const activeFilterBar = document.getElementById('pt-active-filter');
    const heatmapWrap = document.getElementById('pt-heatmap');
    const heatLegend = document.getElementById('pt-heat-legend');
    const heatBar = document.getElementById('pt-heat-bar');
    const heatMin = document.getElementById('pt-heat-min');
    const heatMid = document.getElementById('pt-heat-mid');
    const heatMax = document.getElementById('pt-heat-max');
    const lensBanner = document.getElementById('pt-lens-banner');
    const lensTitle = document.getElementById('pt-lens-title');
    const lensScaleInline = document.getElementById('pt-lens-scale-inline');
    const lensReset = document.getElementById('pt-lens-reset');
    const searchInput = document.getElementById('pt-search');
    const dataNote = document.getElementById('pt-data-note');
    const commandStatus = document.getElementById('pt-command-status');
    const commandOpen = document.getElementById('pt-command-open');
    const commandRoot = document.getElementById('pt-command');
    const commandBackdrop = document.getElementById('pt-command-backdrop');
    const commandInput = document.getElementById('pt-command-input');
    const commandClose = document.getElementById('pt-command-close');
    const commandList = document.getElementById('pt-command-list');
    const detailPanel = document.getElementById('el-panel');
    const atomModelButtons = Array.from(document.querySelectorAll('[data-atom-model]'));
    const atomMotionBtn = document.getElementById('ep-atom-motion');
    const bohrSvg = document.getElementById('bohr-svg');
    const epPrev = document.getElementById('ep-prev');
    const epNext = document.getElementById('ep-next');
    const epCompareBtn = document.getElementById('ep-compare-btn');
    const epCompareTray = document.getElementById('ep-compare-tray');
    const epCompareSelect = document.getElementById('ep-compare-select');
    const epCompareSwap = document.getElementById('ep-compare-swap');
    const epCompareClose = document.getElementById('ep-compare-close');
    const epCompareView = document.getElementById('ep-compare-view');

    const BASE_ELEMENTS = EL.map(([number, symbol, name, mass, cat, shells, col, row, description]) => ({
      number, symbol, name, mass, cat, shells, col, row, description
    }));

    let propertyRefBySymbol = {};
    let elements = [];
    let selectedSymbol = null;
    let compareSymbol = null;
    let compareMode = false;
    let activeCat = 'all';
    let isolatedCat = null;
    let searchQ = '';
    let activeHeatmap = 'none';
    let currentTemp = Number(tempInput.value || 295);
    let commandMatches = new Set();
    let commandSelectedIndex = -1;
    let lastRenderedCommandItems = [];
    let atomModel = 'bohr';
    let atomPaused = false;
    let patternFilter = null;

    let finderLens = null;
    let finderItem = null;
    let practiceIndex = 0;
    let practiceScore = 0;
    let practiceTotal = 0;
    let practiceFeedback = null;
    let practiceShowHint = false;

    const cellBySymbol = new Map();
    const groupAxisBtns = new Map();
    const periodAxisBtns = new Map();
    let gridBuilt = false;

    function hexToRgb(hex) {
      const clean = String(hex || '').replace('#', '');
      const expanded = clean.length === 3 ? clean.split('').map((ch) => ch + ch).join('') : clean;
      const int = parseInt(expanded, 16);
      return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
    }

    function rgba(hex, alpha) {
      const { r, g, b } = hexToRgb(hex);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function normalizeValue(value) {
      if (value === null || value === undefined || value === '') return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }

    function formatCellMass(mass) {
      const n = Number(mass);
      if (!Number.isFinite(n)) return String(mass);
      if (n >= 100) return Number.isInteger(n) ? String(n) : n.toFixed(1);
      if (n >= 10) return n.toFixed(2);
      return n.toFixed(3);
    }

    function simplifyRemoteData(payload) {
      const out = {};
      (payload.elements || []).forEach((element) => {
        if (!element || !element.symbol || element.number > 118) return;
        out[element.symbol] = {
          melt: normalizeValue(element.melt),
          boil: normalizeValue(element.boil),
          density: normalizeValue(element.density),
          electronegativity: normalizeValue(element.electronegativity_pauling),
          electronConfig: String(element.electron_configuration_semantic || element.electron_configuration || '').replace(/^\*/, ''),
          phase: element.phase ? String(element.phase).toLowerCase() : null,
          appearance: element.appearance || '',
          summary: element.summary || ''
        };
      });
      return out;
    }

    async function loadReferenceData() {
      const hasLocal = Object.keys(window.ELEMENT_PROPERTIES || {}).length >= 118;
      if (hasLocal) {
        dataNote.textContent = 'Verified property tables active (offline-ready).';
        dataNote.classList.add('is-ready');
      }
      try {
        const cached = localStorage.getItem(PROPERTY_CACHE_KEY);
        if (cached) {
          propertyRefBySymbol = JSON.parse(cached);
          rebuildElements();
          renderAll();
        }
      } catch (error) {}

      try {
        const response = await fetch(PROPERTY_SOURCE_URL, { cache: 'force-cache' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const json = await response.json();
        propertyRefBySymbol = simplifyRemoteData(json);
        try { localStorage.setItem(PROPERTY_CACHE_KEY, JSON.stringify(propertyRefBySymbol)); } catch (error) {}
        dataNote.textContent = hasLocal
          ? 'Verified property tables active (with extended lab descriptions).'
          : 'Lab property data loaded.';
        dataNote.classList.add('is-ready');
        rebuildElements();
        renderAll();
      } catch (error) {
        if (!hasLocal && !Object.keys(propertyRefBySymbol).length) {
          dataNote.textContent = 'Core lesson mode active.';
          dataNote.classList.remove('is-ready');
        }
      }
    }

    function estimateRarity(base, ref) {
      if (base.number >= 93) return 1;
      if (base.cat === 'ln' || base.cat === 'ac') return 0.78;
      if (['Rh', 'Ir', 'Os', 'Re', 'Pt', 'Au', 'Te'].includes(base.symbol)) return 0.86;
      if (['H', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca', 'Fe'].includes(base.symbol)) return 0.14;
      if (ref && typeof ref.summary === 'string' && /rare|rarest|synthetic/i.test(ref.summary)) return 0.82;
      return Math.min(0.68, 0.18 + base.number / 180);
    }

    function getApplications(symbol, cat) {
      return [].concat(ELEMENT_APPLICATIONS[symbol] || [], CATEGORY_APPLICATIONS[cat] || []).slice(0, 3);
    }

    function getCrystalProfile(symbol, cat) {
      if (['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og'].includes(symbol)) return { label: 'Atomic cloud', note: 'Noble gases stay far apart and only condense at very low temperatures.', mode: 'gas' };
      if (['C', 'Si', 'B'].includes(symbol) || cat === 'ml') return { label: 'Network solid', note: 'Covalent bonds connect atoms into repeating, rigid frameworks.', mode: 'network' };
      if (cat === 'nm' || cat === 'ha') return { label: 'Molecular packing', note: 'Discrete molecules pack together with weaker attractions than metallic lattices.', mode: 'molecular' };
      return { label: 'Metal lattice', note: 'Positive metal ions sit in a repeating lattice with mobile electrons flowing around them.', mode: 'metal' };
    }

    function getEarthProfile(symbol, cat, number) {
      if (number >= 93 || number === 43 || number === 61) {
        const specific = ELEMENT_EARTH[symbol] || {};
        return {
          sources: specific.sources || ['synthetic'],
          forms: specific.forms || ['reactor or accelerator-synthesized isotopes'],
          extraction: specific.extraction || 'Produced inside nuclear reactors or heavy-ion particle accelerators',
          occurrence: specific.occurrence || (number >= 95
            ? 'Synthetic element — not found in significant quantities in Earth’s crust; only tiny lab samples (or single atoms above Z=100) are created'
            : 'Mostly synthetic on Earth today, formed in reactors or trace uranium reactions'),
          role: specific.role || (number >= 104 ? 'Fundamental nuclear structure & superheavy chemistry research' : 'Isotope science, sensors, or reactor research')
        };
      }
      const fallback = CATEGORY_EARTH[cat] || CATEGORY_EARTH.tm;
      const specific = ELEMENT_EARTH[symbol] || {};
      return {
        sources: specific.sources || fallback.sources || [],
        forms: specific.forms || fallback.forms || [],
        extraction: specific.extraction || fallback.extraction,
        occurrence: specific.occurrence || fallback.occurrence,
        role: specific.role || fallback.role
      };
    }

    function rebuildElements() {
      const localTable = window.ELEMENT_PROPERTIES || {};
      elements = BASE_ELEMENTS.map((base) => {
        const ref = propertyRefBySymbol[base.symbol] || {};
        const lp = localTable[base.symbol];
        const hasLocal = Array.isArray(lp) && lp.length >= 7;
        const melt = hasLocal ? normalizeValue(lp[0]) : normalizeValue(ref.melt);
        const boil = hasLocal ? normalizeValue(lp[1]) : normalizeValue(ref.boil);
        const density = hasLocal ? normalizeValue(lp[2]) : normalizeValue(ref.density);
        const electronegativity = hasLocal ? normalizeValue(lp[3]) : normalizeValue(ref.electronegativity);
        const radius = hasLocal ? normalizeValue(lp[4]) : null;
        const ionization = hasLocal ? normalizeValue(lp[5]) : null;
        const phase = hasLocal ? (lp[6] || null) : (ref.phase || null);
        const electronConfig = (hasLocal && lp[7]) ? lp[7] : (ref.electronConfig || base.shells.map((c, i) => 'n' + (i + 1) + ':' + c).join(' · '));
        const oxidation = (hasLocal && lp[8]) ? lp[8] : '—';
        return Object.assign({}, base, {
          melt,
          boil,
          density,
          electronegativity,
          radius,
          ionization,
          electronConfig,
          oxidation,
          phase,
          appearance: ref.appearance || '',
          summary: ref.summary || base.description,
          applications: getApplications(base.symbol, base.cat),
          crystal: getCrystalProfile(base.symbol, base.cat),
          earth: getEarthProfile(base.symbol, base.cat, base.number),
          rarity: estimateRarity(base, ref)
        });
      });
    }

    function getState(element, temperature) {
      if (element.phase === 'predicted' || (!Number.isFinite(element.melt) && !Number.isFinite(element.boil))) {
        return 'unknown';
      }
      if (!Number.isFinite(element.melt) && Number.isFinite(element.boil)) {
        if (element.symbol === 'He') return temperature < element.boil ? 'liquid' : 'gas';
        return temperature < element.boil ? 'solid' : 'gas';
      }
      if (temperature < element.melt) return 'solid';
      if (!Number.isFinite(element.boil) || temperature < element.boil) return 'liquid';
      return 'gas';
    }

    function getStateLabel(state) {
      return state === 'solid' || state === 'liquid' || state === 'gas' ? state : 'predicted';
    }

    function getStateSubtitle() {
      if (currentTemp <= 80) return 'Cryogenic range';
      if (currentTemp < 260) return 'Cold lab';
      if (currentTemp < 330) return 'Room temperature';
      if (currentTemp < 900) return 'Hot plate';
      if (currentTemp < 1800) return 'Foundry range';
      return 'Stellar-hot lab';
    }

    function getHeatmapValue(element) {
      if (activeHeatmap === 'radius') return element.radius;
      if (activeHeatmap === 'ionization') return element.ionization;
      if (activeHeatmap === 'density') return element.density;
      if (activeHeatmap === 'electronegativity') return element.electronegativity;
      if (activeHeatmap === 'melt') return element.melt;
      if (activeHeatmap === 'boil') return element.boil;
      if (activeHeatmap === 'mass') return Number(element.mass);
      if (activeHeatmap === 'rarity') return Math.round(element.rarity * 100);
      return null;
    }

    function getHeatmapBounds() {
      if (activeHeatmap === 'none') return null;
      const values = elements.map(getHeatmapValue).filter((v) => Number.isFinite(v));
      if (!values.length) return null;
      return { min: Math.min.apply(null, values), max: Math.max.apply(null, values) };
    }

    function getHeatmapIntensity(element, bounds) {
      if (activeHeatmap === 'none' || !bounds) return 0;
      const value = getHeatmapValue(element);
      if (!Number.isFinite(value) || bounds.max <= bounds.min) return 0;
      return Math.pow((value - bounds.min) / (bounds.max - bounds.min), 0.72);
    }

    function getCellBackground(element, state, intensity) {
      const dark = isDarkTheme();
      const base = catColor(element.cat);
      const heatOverlay = intensity > 0 ? HEATMAPS[activeHeatmap].tint.replace('VAR', (dark ? (0.28 + intensity * 0.56) : (0.18 + intensity * 0.58)).toFixed(3)) : null;
      const layers = [];
      if (heatOverlay) layers.push(heatOverlay);
      if (dark) {
        if (state === 'liquid') {
          layers.push('linear-gradient(180deg, rgba(14,165,233,0.34), rgba(30,58,138,0.44))');
        } else if (state === 'gas') {
          layers.push('radial-gradient(circle at 50% 35%, rgba(255,255,255,0.16), rgba(255,255,255,0.03) 65%, rgba(0,0,0,0.18) 100%)');
        } else if (state === 'unknown') {
          layers.push('linear-gradient(180deg, rgba(255,255,255,0.09), ' + rgba(base, 0.14) + ')');
        } else {
          layers.push('linear-gradient(180deg, ' + rgba(base, 0.24) + ', rgba(20,24,34,0.72))');
        }
      } else {
        if (state === 'liquid') {
          layers.push('linear-gradient(180deg, rgba(255,255,255,0.84), rgba(59,130,246,0.22))');
          layers.push('linear-gradient(135deg, rgba(56,189,248,0.32), rgba(14,165,233,0.18))');
        } else if (state === 'gas') {
          layers.push('radial-gradient(circle at 50% 35%, rgba(255,255,255,0.92), rgba(255,255,255,0.2) 58%, rgba(226,232,240,0.45) 100%)');
        } else if (state === 'unknown') {
          layers.push('linear-gradient(180deg, rgba(255,255,255,0.78), ' + rgba(base, 0.14) + ')');
        } else {
          layers.push('linear-gradient(180deg, rgba(255,255,255,0.88), ' + rgba(base, 0.18) + ')');
          layers.push('linear-gradient(135deg, ' + rgba(base, 0.09) + ', rgba(255,255,255,0.2))');
        }
      }
      return layers.join(', ');
    }

    function matchesFilters(element) {
      const matchesCat = activeCat === 'all' || element.cat === activeCat;
      const matchesSearch = !searchQ || element.symbol.toLowerCase().includes(searchQ) || element.name.toLowerCase().includes(searchQ) || String(element.number).startsWith(searchQ);
      return matchesCat && matchesSearch && (!patternFilter || patternFilter(element));
    }

    function updateActiveFilterChip() {
      if (!activeFilterBar) return;
      const hasCat = activeCat !== 'all';
      const hasSearch = !!searchQ;
      const hasPattern = !!patternFilter;
      const hasCmd = commandMatches.size > 0;
      if (!hasCat && !hasSearch && !hasPattern && !hasCmd) {
        activeFilterBar.hidden = true;
        activeFilterBar.innerHTML = '';
        return;
      }
      const matchCount = elements.filter((e) => matchesFilters(e) && (!hasCmd || commandMatches.has(e.symbol))).length;
      const visibleCount = hasCmd ? commandMatches.size : elements.filter(matchesFilters).length;
      const parts = [];
      if (hasCat) parts.push(CATS[activeCat].label);
      if (hasSearch) parts.push('search “' + searchQ + '”');
      if (hasPattern) parts.push('pattern lens');
      if (hasCmd) parts.push('command topic');
      activeFilterBar.hidden = false;
      activeFilterBar.innerHTML = '<span>Showing ' + (hasCmd && !hasCat && !hasSearch && !hasPattern ? visibleCount : matchCount) + ' / 118 (' + parts.join(' · ') + ')</span>'
        + '<button type="button" class="pt-active-filter-reset" id="pt-clear-all-filters">Clear filters</button>';
      const btn = document.getElementById('pt-clear-all-filters');
      if (btn) btn.addEventListener('click', clearAllFilters);
    }

    function clearAllFilters() {
      activeCat = 'all';
      isolatedCat = null;
      searchQ = '';
      if (searchInput) searchInput.value = '';
      if (quickSearch) quickSearch.value = '';
      commandMatches = new Set();
      if (commandStatus) commandStatus.textContent = 'Try “batteries”, “balloons”, or “chips”.';
      if (finderLens !== 'practice') {
        finderLens = null;
        finderItem = null;
        patternFilter = null;
      } else {
        patternFilter = null;
      }
      renderAll();
    }

    function renderCategoryControls() {
      ctrl.innerHTML = '';
      const dark = isDarkTheme();
      const defs = [['all', { label: 'All 118', color: dark ? '#cbd5e1' : '#475569' }]].concat(Object.entries(CATS));
      defs.forEach(([key, meta]) => {
        const inkColor = key === 'all' ? meta.color : (dark ? meta.darkColor : meta.color);
        const fillColor = meta.color;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pt-filter-btn';
        btn.dataset.cat = key;
        btn.textContent = meta.label;
        btn.style.color = inkColor;
        btn.style.borderColor = key === 'all' ? (dark ? '#64748b' : '#94a3b8') : inkColor;
        const active = activeCat === key;
        btn.classList.toggle('pt-btn-active', active && key !== 'all');
        btn.classList.toggle('pt-btn-dimmed', activeCat !== 'all' && !active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (active && key !== 'all') {
          btn.style.background = fillColor;
          btn.style.color = '#fff';
        }
        btn.addEventListener('mouseenter', () => { if (key !== 'all') { isolatedCat = key; updateGrid(); } });
        btn.addEventListener('mouseleave', () => { if (isolatedCat === key) { isolatedCat = null; updateGrid(); } });
        btn.addEventListener('click', () => { activeCat = (activeCat === key && key !== 'all') ? 'all' : key; renderAll(); });
        ctrl.appendChild(btn);
      });
    }

    function renderLegend() {
      legend.innerHTML = '';
      Object.entries(CATS).forEach(([key, meta]) => {
        const c = catColor(key);
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'pt-legend-item';
        item.innerHTML = '<span class="pt-legend-dot" style="background:' + rgba(c, 0.22) + ';border:1.5px solid ' + c + ';"></span>' + meta.label;
        item.addEventListener('mouseenter', () => { isolatedCat = key; updateGrid(); });
        item.addEventListener('mouseleave', () => { isolatedCat = null; updateGrid(); });
        item.addEventListener('click', () => { activeCat = (activeCat === key) ? 'all' : key; renderAll(); });
        legend.appendChild(item);
      });
    }

    function formatScaleValue(v) {
      if (v >= 100) return String(Math.round(v));
      if (v >= 10) return v.toFixed(1);
      if (v >= 1) return v.toFixed(2);
      if (v >= 0.01) return v.toFixed(2);
      return v.toExponential(1);
    }

    function renderHeatmapControls() {
      heatmapWrap.innerHTML = '';
      Object.entries(HEATMAPS).forEach(([key, meta]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pt-heat-btn';
        btn.textContent = meta.label;
        btn.classList.toggle('is-active', activeHeatmap === key);
        btn.setAttribute('aria-pressed', activeHeatmap === key ? 'true' : 'false');
        btn.addEventListener('click', () => {
          activeHeatmap = activeHeatmap === key ? 'none' : key;
          renderAll();
        });
        heatmapWrap.appendChild(btn);
      });

      if (quickLens) quickLens.value = activeHeatmap;

      if (activeHeatmap !== 'none' && HEATMAPS[activeHeatmap]) {
        const meta = HEATMAPS[activeHeatmap];
        const bounds = getHeatmapBounds();
        if (bounds) {
          const mid = (bounds.min + bounds.max) / 2;
          const unit = meta.unit ? (meta.unit.startsWith('/') ? meta.unit : ' ' + meta.unit) : '';
          const grad = 'linear-gradient(90deg, ' + meta.tint.replace('VAR', '0.18') + ', ' + meta.tint.replace('VAR', '0.88') + ')';
          if (heatLegend) {
            heatLegend.hidden = false;
            if (heatMin) heatMin.textContent = formatScaleValue(bounds.min) + unit;
            if (heatMid) heatMid.textContent = formatScaleValue(mid) + unit;
            if (heatMax) heatMax.textContent = formatScaleValue(bounds.max) + unit;
            if (heatBar) heatBar.style.background = grad;
          }
          if (lensBanner) {
            lensBanner.hidden = false;
            if (lensTitle) lensTitle.textContent = 'Property Lens: ' + meta.label + (meta.unit ? ' (' + meta.unit + ')' : '');
            if (lensScaleInline) {
              lensScaleInline.innerHTML = '<span>' + formatScaleValue(bounds.min) + unit + '</span>'
                + '<span class="pt-lens-scale-swatch" style="background:' + grad + '"></span>'
                + '<span>' + formatScaleValue(bounds.max) + unit + '</span>';
            }
          }
        }
      } else {
        if (heatLegend) heatLegend.hidden = true;
        if (lensBanner) lensBanner.hidden = true;
      }
    }

    if (lensReset) {
      lensReset.addEventListener('click', () => {
        activeHeatmap = 'none';
        renderAll();
      });
    }

    function buildGridOnce() {
      if (gridBuilt) return;
      grid.innerHTML = '';

      // Group axis buttons (1..18) across row 1, starting at col 2
      for (let g = 1; g <= 18; g++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pt-axis-btn pt-axis-group';
        btn.textContent = String(g);
        btn.style.gridColumn = String(g + 1);
        btn.style.gridRow = '1';
        btn.setAttribute('aria-label', 'Highlight Group ' + g);
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', () => {
          const same = finderLens === 'group' && finderItem === String(g);
          finderLens = same ? null : 'group';
          finderItem = same ? null : String(g);
          applyFinder();
        });
        grid.appendChild(btn);
        groupAxisBtns.set(g, btn);
      }

      // Period axis buttons (1..7, plus 6* & 7* for f-block rows)
      [[1, 2, '1'], [2, 3, '2'], [3, 4, '3'], [4, 5, '4'], [5, 6, '5'], [6, 7, '6'], [7, 8, '7'], [6, 10, '6*'], [7, 11, '7*']].forEach(([p, r, label]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pt-axis-btn pt-axis-period';
        btn.textContent = label;
        btn.style.gridColumn = '1';
        btn.style.gridRow = String(r);
        btn.setAttribute('aria-label', 'Highlight Period ' + p);
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', () => {
          const same = finderLens === 'period' && finderItem === String(p);
          finderLens = same ? null : 'period';
          finderItem = same ? null : String(p);
          applyFinder();
        });
        grid.appendChild(btn);
        if (!periodAxisBtns.has(p)) periodAxisBtns.set(p, []);
        periodAxisBtns.get(p).push(btn);
      });

      const frow = document.createElement('div');
      frow.className = 'pt-frow';
      frow.setAttribute('aria-hidden', 'true');
      frow.innerHTML = '<div class="pt-frow-line"></div><span class="pt-frow-label">f-block (Lanthanides &amp; Actinides)</span><div class="pt-frow-line"></div>';
      grid.appendChild(frow);

      [[4, 7, '57–71', 'lanthanide', 'Highlight Lanthanides (57–71)'], [4, 8, '89–103', 'actinide', 'Highlight Actinides (89–103)']].forEach(([col, row, label, fam, aria]) => {
        const ph = document.createElement('button');
        ph.type = 'button';
        ph.className = 'pt-ph';
        ph.style.gridColumn = String(col);
        ph.style.gridRow = String(row);
        ph.textContent = label;
        ph.setAttribute('aria-label', aria);
        ph.addEventListener('click', () => {
          const same = finderLens === 'family' && finderItem === fam;
          finderLens = same ? null : 'family';
          finderItem = same ? null : fam;
          applyFinder();
        });
        grid.appendChild(ph);
      });

      BASE_ELEMENTS.forEach((base) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'el';
        cell.dataset.z = String(base.number);
        cell.dataset.cat = base.cat;
        cell.dataset.col = String(base.col);
        cell.dataset.row = String(base.row);
        cell.style.gridColumn = String(base.col + 1);
        cell.style.gridRow = String(base.row + 1);
        cell.title = base.name + ' (' + base.symbol + ', Z=' + base.number + ')';

        const numEl = document.createElement('span');
        numEl.className = 'el-num';
        numEl.textContent = String(base.number);

        const symEl = document.createElement('span');
        symEl.className = 'el-sym';
        symEl.textContent = base.symbol;

        const nameEl = document.createElement('span');
        nameEl.className = 'el-name';
        nameEl.textContent = base.name;

        const phaseEl = document.createElement('span');
        phaseEl.className = 'el-phase';

        const massEl = document.createElement('span');
        massEl.className = 'el-mass';

        cell.append(numEl, symEl, nameEl, phaseEl, massEl);
        cell.addEventListener('click', () => {
          const element = elements.find((e) => e.symbol === base.symbol);
          if (!element) return;
          if (compareMode && selectedSymbol && selectedSymbol !== element.symbol) {
            compareSymbol = element.symbol;
            if (epCompareSelect) epCompareSelect.value = element.symbol;
            updateGrid();
            const curr = elements.find((e) => e.symbol === selectedSymbol);
            if (curr) renderStats(curr);
            return;
          }
          if (finderLens === 'practice') {
            handlePracticeGuess(element);
          }
          showElement(element, false);
          cell.focus({ preventScroll: true });
        });
        grid.appendChild(cell);
        cellBySymbol.set(base.symbol, { cell, phaseEl, massEl });
      });

      gridBuilt = true;
    }

    function updateGrid() {
      buildGridOnce();
      const dark = isDarkTheme();
      const bounds = getHeatmapBounds();

      groupAxisBtns.forEach((btn, g) => {
        const active = finderLens === 'group' && finderItem === String(g);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      periodAxisBtns.forEach((btns, p) => {
        const active = finderLens === 'period' && finderItem === String(p);
        btns.forEach((btn) => btn.setAttribute('aria-pressed', active ? 'true' : 'false'));
      });

      elements.forEach((element) => {
        const entry = cellBySymbol.get(element.symbol);
        if (!entry) return;
        const { cell, phaseEl, massEl } = entry;
        const color = catColor(element.cat);
        const state = getState(element, currentTemp);
        const intensity = getHeatmapIntensity(element, bounds);

        cell.style.background = getCellBackground(element, state, intensity);
        cell.style.color = state === 'gas' ? (dark ? '#cbd5e1' : '#395366') : color;
        cell.style.borderColor = state === 'liquid'
          ? (dark ? 'rgba(56,189,248,0.52)' : 'rgba(2,132,199,0.42)')
          : rgba(color, dark ? 0.44 : 0.34);

        cell.classList.toggle('el-selected', selectedSymbol === element.symbol);
        cell.classList.toggle('el-compare-selected', compareMode && compareSymbol === element.symbol);
        cell.classList.toggle('el-dimmed', !matchesFilters(element));
        cell.classList.toggle('el-isolated-out', !!isolatedCat && element.cat !== isolatedCat);
        cell.classList.toggle('el-command-match', commandMatches.has(element.symbol));
        const stateLabel = getStateLabel(state);
        cell.setAttribute('aria-label', element.name + ', element ' + element.number + ', ' + stateLabel + ' at ' + currentTemp + ' Kelvin');

        phaseEl.textContent = stateLabel === 'predicted' ? 'Pred.' : stateLabel;
        phaseEl.title = stateLabel;

        let bottomText = formatCellMass(element.mass);
        let isProp = false;
        if (activeHeatmap === 'radius') {
          bottomText = Number.isFinite(element.radius) ? element.radius + ' pm' : '—';
          isProp = true;
        } else if (activeHeatmap === 'ionization') {
          bottomText = Number.isFinite(element.ionization) ? String(Math.round(element.ionization)) : '—';
          isProp = true;
        } else if (activeHeatmap === 'electronegativity') {
          bottomText = Number.isFinite(element.electronegativity) ? element.electronegativity.toFixed(2) : '—';
          isProp = true;
        } else if (activeHeatmap === 'density') {
          bottomText = Number.isFinite(element.density) ? (element.density < 0.01 ? element.density.toExponential(1) : element.density.toFixed(2)) : '—';
          isProp = true;
        } else if (activeHeatmap === 'melt') {
          bottomText = Number.isFinite(element.melt) ? Math.round(element.melt) + ' K' : '—';
          isProp = true;
        } else if (activeHeatmap === 'boil') {
          bottomText = Number.isFinite(element.boil) ? Math.round(element.boil) + ' K' : '—';
          isProp = true;
        } else if (activeHeatmap === 'mass') {
          bottomText = formatCellMass(element.mass);
          isProp = true;
        } else if (activeHeatmap === 'rarity') {
          bottomText = Math.round(element.rarity * 100) + '%';
          isProp = true;
        }
        massEl.textContent = bottomText;
        massEl.classList.toggle('is-property-value', isProp);
      });

      updateActiveFilterChip();
    }

    grid.addEventListener('keydown', (event) => {
      const target = event.target.closest('.el');
      if (!target) return;
      const currentZ = Number(target.dataset.z);
      const currentEl = elements.find((e) => e.number === currentZ);
      if (!currentEl) return;

      let nextEl = null;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const rowNext = elements.filter((e) => e.row === currentEl.row && e.col > currentEl.col).sort((a, b) => a.col - b.col);
        nextEl = rowNext[0] || elements.find((e) => e.number === currentZ + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const rowPrev = elements.filter((e) => e.row === currentEl.row && e.col < currentEl.col).sort((a, b) => b.col - a.col);
        nextEl = rowPrev[0] || elements.find((e) => e.number === currentZ - 1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const colDown = elements.filter((e) => e.col === currentEl.col && e.row > currentEl.row).sort((a, b) => a.row - b.row);
        nextEl = colDown[0];
        if (!nextEl) {
          const candidates = elements.filter((e) => e.row > currentEl.row);
          if (candidates.length) {
            nextEl = candidates.reduce((best, cur) => {
              const dCur = Math.abs(cur.col - currentEl.col) + (cur.row - currentEl.row) * 2;
              const dBest = Math.abs(best.col - currentEl.col) + (best.row - currentEl.row) * 2;
              return dCur < dBest ? cur : best;
            });
          }
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const colUp = elements.filter((e) => e.col === currentEl.col && e.row < currentEl.row).sort((a, b) => b.row - a.row);
        nextEl = colUp[0];
        if (!nextEl) {
          const candidates = elements.filter((e) => e.row < currentEl.row);
          if (candidates.length) {
            nextEl = candidates.reduce((best, cur) => {
              const dCur = Math.abs(cur.col - currentEl.col) + (currentEl.row - cur.row) * 2;
              const dBest = Math.abs(best.col - currentEl.col) + (currentEl.row - best.row) * 2;
              return dCur < dBest ? cur : best;
            });
          }
        }
      } else if (event.key === 'Home') {
        event.preventDefault();
        const rowEls = elements.filter((e) => e.row === currentEl.row).sort((a, b) => a.col - b.col);
        nextEl = rowEls[0];
      } else if (event.key === 'End') {
        event.preventDefault();
        const rowEls = elements.filter((e) => e.row === currentEl.row).sort((a, b) => b.col - a.col);
        nextEl = rowEls[0];
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showElement(currentEl, true);
        return;
      }

      if (nextEl) {
        showElement(nextEl, false);
        const entry = cellBySymbol.get(nextEl.symbol);
        if (entry) entry.cell.focus({ preventScroll: true });
      }
    });

    function buildBohr(shells, color, electronegativity) {
      const cx = 140;
      const cy = 140;
      const count = shells.length;
      const minR = count <= 2 ? 44 : count <= 4 ? 32 : 24;
      const maxR = Math.min(124, minR + (count - 1) * 24);
      const orbitBias = Number.isFinite(electronegativity) ? Math.max(0.55, 1.32 - electronegativity * 0.14) : 1;
      let svg = '<g transform="translate(' + cx + ',' + cy + ')">';
      shells.forEach((electrons, index) => {
        const r = count === 1 ? 58 : minR + (index / (count - 1)) * (maxR - minR);
        const isValence = index === count - 1;
        svg += '<circle class="orbit-ring' + (isValence ? ' is-valence' : '') + '" cx="0" cy="0" r="' + r.toFixed(1) + '"/>';
        if (electrons <= 0) return;
        const duration = (4.2 + index * 2.4) * orbitBias;
        const direction = index % 2 === 0 ? 'orb-cw' : 'orb-ccw';
        const step = (2 * Math.PI) / electrons;
        let dots = '';
        for (let i = 0; i < electrons; i++) {
          const angle = step * i;
          const x = (r * Math.cos(angle)).toFixed(1);
          const y = (r * Math.sin(angle)).toFixed(1);
          dots += '<circle cx="' + x + '" cy="' + y + '" r="' + (isValence ? '4.8' : '3.8') + '" fill="' + color + '" opacity="' + (isValence ? '0.98' : '0.72') + '"' + (isValence ? ' stroke="#ffffff" stroke-width="1.1"' : '') + '/>';
        }
        svg += '<g style="transform-origin:0 0;animation:' + direction + ' ' + duration.toFixed(2) + 's linear infinite">' + dots + '</g>';
      });
      const total = shells.reduce((sum, n) => sum + n, 0);
      const nucR = Math.min(20, 9 + count * 1.4);
      svg += '<circle cx="0" cy="0" r="' + nucR.toFixed(1) + '" fill="' + color + '" opacity="0.95"/>';
      svg += '<text x="0" y="0" style="font-size:' + (total > 99 ? 9 : total > 9 ? 11 : 13) + 'px;font-weight:800;fill:#fff;text-anchor:middle;dominant-baseline:central;">' + total + '</text>';
      svg += '</g>';
      return svg;
    }

    function getOrbitalBlock(element) {
      if (element.cat === 'ln' || element.cat === 'ac') return 'f';
      if (element.col <= 2 || element.symbol === 'He') return 's';
      if (element.col >= 13) return 'p';
      return 'd';
    }

    function buildQuantumModel(element, color) {
      const total = element.shells.reduce((sum, count) => sum + count, 0);
      const block = getOrbitalBlock(element);
      const valence = element.shells[element.shells.length - 1] || 0;
      const shellCount = element.shells.length;
      const lobeSize = 42 + Math.min(44, shellCount * 7 + valence * 1.5);
      const opacity = Math.min(0.78, 0.22 + total / 170);
      const labelInk = isDarkTheme() ? '#cbd5e1' : '#475569';
      let svg = '<defs>';
      svg += '<radialGradient id="qm-core" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="' + color + '" stop-opacity="0.95"/><stop offset="62%" stop-color="' + color + '" stop-opacity="0.28"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></radialGradient>';
      svg += '<radialGradient id="qm-lobe" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white" stop-opacity="0.72"/><stop offset="34%" stop-color="' + color + '" stop-opacity="0.52"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></radialGradient>';
      svg += '</defs>';
      svg += '<rect x="6" y="6" width="268" height="268" rx="36" fill="' + rgba(color, 0.06) + '" stroke="' + rgba(color, 0.18) + '"/>';
      element.shells.forEach((count, index) => {
        const radius = 24 + index * 15;
        const alpha = Math.min(0.42, 0.1 + count / 80);
        svg += '<circle class="qm-cloud" cx="140" cy="140" r="' + radius + '" fill="none" stroke="' + rgba(color, alpha) + '" stroke-width="' + Math.max(5, 12 - index) + '"/>';
      });
      if (block === 's') {
        svg += '<circle class="qm-cloud" cx="140" cy="140" r="' + Math.min(116, 48 + shellCount * 10) + '" fill="url(#qm-core)" opacity="' + opacity.toFixed(2) + '"/>';
      } else if (block === 'p') {
        [[0, -40, 32, lobeSize], [0, 40, 32, lobeSize], [-40, 0, lobeSize, 32], [40, 0, lobeSize, 32]].forEach(([dx, dy, rx, ry]) => {
          svg += '<ellipse class="qm-cloud" cx="' + (140 + dx) + '" cy="' + (140 + dy) + '" rx="' + rx + '" ry="' + ry + '" fill="url(#qm-lobe)" stroke="' + rgba(color, 0.28) + '" stroke-width="1.5" opacity="0.64"/>';
        });
      } else if (block === 'd') {
        [45, 135, 225, 315].forEach((angle) => {
          const rad = angle * Math.PI / 180;
          svg += '<ellipse class="qm-cloud" cx="' + (140 + Math.cos(rad) * 40).toFixed(1) + '" cy="' + (140 + Math.sin(rad) * 40).toFixed(1) + '" rx="29" ry="' + lobeSize + '" fill="url(#qm-lobe)" stroke="' + rgba(color, 0.26) + '" stroke-width="1.4" opacity="0.56" transform="rotate(' + angle + ',140,140)"/>';
        });
      } else {
        [0, 30, 60, 90, 120, 150].forEach((angle, index) => {
          svg += '<ellipse class="qm-cloud" cx="140" cy="140" rx="' + (34 + index * 2) + '" ry="' + Math.min(118, 76 + shellCount * 5) + '" fill="url(#qm-lobe)" stroke="' + rgba(color, 0.22) + '" stroke-width="1.2" opacity="0.36" transform="rotate(' + angle + ',140,140)"/>';
        });
      }
      svg += '<circle cx="140" cy="140" r="18" fill="' + color + '" opacity="0.94"/>';
      svg += '<text x="140" y="140" font-size="' + (total > 99 ? 9 : 12) + '" font-weight="900" fill="white" text-anchor="middle" dominant-baseline="central">' + element.symbol + '</text>';
      svg += '<text x="140" y="256" font-size="10" font-weight="800" fill="' + labelInk + '" text-anchor="middle">' + block.toUpperCase() + '-block probability cloud · ' + total + ' electrons</text>';
      return svg;
    }

    function renderAtomExplain(element) {
      const host = document.getElementById('ep-atom-explain');
      const quantum = atomModel === 'quantum';
      host.innerHTML = '<summary>A teaching model, not a picture of a real atom</summary>'
        + '<h4>What you are viewing</h4><ul>'
        + '<li>' + (quantum
          ? 'Fuzzy <strong>probability clouds</strong> arranged by shell and by block (s, p, d, f). A cloud shows where an electron is <em>likely</em> to be found, not where it is.'
          : 'A <strong>nucleus</strong> (' + element.number + ' protons) and rings showing how many electrons sit in each energy shell: ' + element.shells.join(' · ') + '. The highlighted outer ring marks the valence shell.') + '</li>'
        + '<li>The electron counts per shell are real data for the ground state. Everything else about the drawing is a convenient picture.</li></ul>'
        + '<h4>What is simplified</h4><ul>'
        + (quantum
          ? '<li>Shapes and spread are schematic. Real orbitals come from solving the Schrödinger equation, have distinct lobes and nodes, and have no hard edge.</li>'
          : '<li>Electrons do <strong>not</strong> orbit on circular tracks like planets. Niels Bohr’s 1913 picture works well for hydrogen only and fails for multi-electron atoms.</li>')
        + '<li>Not to scale: the nucleus is about 100,000 times smaller than the atom. If the atom were a stadium, the nucleus would be a pea.</li>'
        + '<li>Electrons are not dots: they behave as waves and particles, and they cannot be pinned to an exact position and speed at once.</li></ul>'
        + '<h4>Why it matters</h4><p>The shell count tells you the <strong>period</strong>, and the electrons in the outermost shell (the valence electrons) set the <strong>group</strong>, bonding and reactivity. That is why ' + element.name + ' behaves like its column neighbours.</p>';
    }

    function renderAtomModel(element, color) {
      const title = document.getElementById('ep-model-title');
      const note = document.getElementById('ep-shell-note');
      const summary = document.getElementById('ep-atom-summary');
      atomModelButtons.forEach((button) => button.setAttribute('aria-pressed', button.dataset.atomModel === atomModel ? 'true' : 'false'));
      renderAtomExplain(element);
      const valence = element.shells[element.shells.length - 1] || 0;
      const period = element.shells.length;
      const block = getOrbitalBlock(element);
      const grpLabel = (element.cat === 'ln' || element.cat === 'ac') ? 'f-block' : 'Group ' + element.col;
      if (summary) {
        summary.innerHTML = [
          ['Period ' + period, period + ' shell' + (period > 1 ? 's' : '')],
          [grpLabel, block + '-block'],
          ['Outer shell', valence + ' e⁻'],
          ['Shells', element.shells.join(' · ')]
        ].map(([k, v]) => '<span class="ep-atom-chip">' + k + ': ' + v + '</span>').join('');
      }
      if (bohrSvg) bohrSvg.classList.toggle('is-paused', atomPaused);
      if (atomModel === 'quantum') {
        title.textContent = 'Quantum Cloud Model';
        bohrSvg.innerHTML = buildQuantumModel(element, color);
        note.textContent = 'Simplified quantum mode: electron clouds show probability regions by shell count and periodic-table block, not fixed circular paths.';
        return;
      }
      title.textContent = 'Electron Shell Model';
      bohrSvg.innerHTML = buildBohr(element.shells, color, element.electronegativity);
      note.textContent = 'Simplified Bohr model: rings organize electrons by energy level (dashed ring = outer valence shell).';
    }

    let crystalViewer = null;
    function renderCrystal(element, color) {
      if (!window.CrystalViewer) return;
      if (!crystalViewer) crystalViewer = window.CrystalViewer.mount(document.getElementById('crystal-host'));
      crystalViewer.setElement({
        symbol: element.symbol,
        name: element.name,
        number: element.number,
        color: color,
        mass: Number(element.mass),
        density: element.density,
        melt: element.melt,
        temp: currentTemp
      });
    }

    function formatValue(value, suffix, digits) {
      if (!Number.isFinite(value)) return 'Unknown';
      const precision = typeof digits === 'number' ? digits : value >= 100 ? 0 : value < 0.01 ? 4 : 2;
      return Number(value).toFixed(precision) + (suffix || '');
    }

    function formatStateText(element) {
      const state = getState(element, currentTemp);
      if (state === 'solid') return Number.isFinite(element.melt) ? 'Solid below ' + formatValue(element.melt, ' K', 0) : 'Sublimes below ' + formatValue(element.boil, ' K', 0);
      if (state === 'liquid') return Number.isFinite(element.boil) ? 'Liquid until ' + formatValue(element.boil, ' K', 0) : 'Liquid in this temperature band';
      if (state === 'gas') return Number.isFinite(element.boil) ? 'Gas above ' + formatValue(element.boil, ' K', 0) : 'Gas under standard conditions';
      return 'Too short-lived to measure';
    }

    function buildCompareView(element, other) {
      const state = getState(element, currentTemp);
      const otherState = getState(other, currentTemp);
      const compRows = [
        ['Protons (Z)', element.number, other.number, element.number, other.number],
        ['Category', CATS[element.cat].label, CATS[other.cat].label],
        ['State (' + currentTemp + ' K)', getStateLabel(state), getStateLabel(otherState)],
        ['Atomic mass', element.mass + ' amu', other.mass + ' amu', Number(element.mass), Number(other.mass)],
        ['Atomic radius', formatValue(element.radius, ' pm', 0), formatValue(other.radius, ' pm', 0), element.radius, other.radius],
        ['1st Ionization', formatValue(element.ionization, ' kJ/mol', 0), formatValue(other.ionization, ' kJ/mol', 0), element.ionization, other.ionization],
        ['Electronegativity', formatValue(element.electronegativity, '', 2), formatValue(other.electronegativity, '', 2), element.electronegativity, other.electronegativity],
        ['Density', formatValue(element.density, ' g/cm³', 2), formatValue(other.density, ' g/cm³', 2), element.density, other.density],
        ['Melting point', formatValue(element.melt, ' K', 0), formatValue(other.melt, ' K', 0), element.melt, other.melt],
        ['Boiling point', formatValue(element.boil, ' K', 0), formatValue(other.boil, ' K', 0), element.boil, other.boil],
        ['Electron shells', element.shells.join(' · '), other.shells.join(' · ')],
        ['Crystal', element.crystal.label, other.crystal.label]
      ];
      return '<div class="ep-compare-table-wrap"><table class="ep-compare-table" aria-label="Side-by-side element comparison">'
        + '<thead><tr><th>Property</th><th>' + element.symbol + ' · ' + element.name + '</th><th>' + other.symbol + ' · ' + other.name + '</th></tr></thead>'
        + '<tbody>'
        + compRows.map(([prop, valA, valB, numA, numB]) => {
          let barA = '';
          let barB = '';
          if (Number.isFinite(numA) && Number.isFinite(numB) && (numA > 0 || numB > 0)) {
            const max = Math.max(numA, numB);
            const pctA = Math.max(6, Math.round((numA / max) * 100));
            const pctB = Math.max(6, Math.round((numB / max) * 100));
            barA = '<div class="ep-compare-bar-track"><div class="ep-compare-bar-fill" style="width:' + pctA + '%"></div></div>';
            barB = '<div class="ep-compare-bar-track"><div class="ep-compare-bar-fill" style="width:' + pctB + '%"></div></div>';
          }
          return '<tr><td class="ep-compare-prop">' + prop + '</td><td class="ep-compare-val-a">' + valA + barA + '</td><td class="ep-compare-val-b">' + valB + barB + '</td></tr>';
        }).join('')
        + '</tbody></table></div>';
    }

    function renderStats(element) {
      const state = getState(element, currentTemp);
      const stats = [
        { label: 'Current state', value: getStateLabel(state), sub: currentTemp + ' K · ' + formatStateText(element) },
        { label: 'Density', value: formatValue(element.density, ' g/cm³'), sub: 'Mass packed into a given volume.' },
        { label: 'Melting point', value: formatValue(element.melt, ' K', 0), sub: element.symbol === 'C' || element.symbol === 'As' ? 'Sublimes at 1 atm.' : 'Where the solid begins to loosen.' },
        { label: 'Boiling point', value: formatValue(element.boil, ' K', 0), sub: 'Where particles escape into gas.' },
        { label: 'Atomic radius', value: formatValue(element.radius, ' pm', 0), sub: 'Covalent radius in picometers.' },
        { label: '1st Ionization', value: formatValue(element.ionization, ' kJ/mol', 0), sub: 'Energy to remove an outer electron.' },
        { label: 'Electronegativity', value: formatValue(element.electronegativity, '', 2), sub: 'Higher values pull shared electrons harder.' },
        { label: 'Oxidation states', value: element.oxidation || '—', sub: 'Common bonding charges.' },
        { label: 'Scarcity index', value: Math.round(element.rarity * 100) + ' / 100', sub: 'Higher scores mean rarer or synthetic.' },
        { label: 'Electron shells', value: element.shells.join(' · '), sub: element.electronConfig || 'Shell population model' }
      ];

      document.getElementById('ep-stats').innerHTML = stats.map((stat) =>
        '<div class="ep-stat"><span class="ep-stat-label">' + stat.label + '</span><span class="ep-stat-value">' + stat.value + '</span><span class="ep-stat-sub">' + stat.sub + '</span></div>'
      ).join('');

      if (epCompareView) {
        if (compareMode && compareSymbol) {
          const other = elements.find((e) => e.symbol === compareSymbol);
          if (other) {
            epCompareView.hidden = false;
            epCompareView.innerHTML = buildCompareView(element, other);
          } else {
            epCompareView.hidden = true;
            epCompareView.innerHTML = '';
          }
        } else {
          epCompareView.hidden = true;
          epCompareView.innerHTML = '';
        }
      }
    }

    function renderUsage(element) {
      document.getElementById('ep-usage').innerHTML = element.applications.map((item) =>
        '<article class="ep-usage-item"><span class="ep-usage-icon">' + item.icon + '</span><span class="ep-usage-title">' + item.title + '</span><span class="ep-usage-copy">' + item.copy + '</span></article>'
      ).join('');
    }

    function renderStory(element) {
      const host = document.getElementById('ep-story');
      const story = ELEMENT_STORIES[element.symbol];
      if (!story) {
        host.hidden = true;
        host.innerHTML = '';
        return;
      }
      host.hidden = false;
      host.innerHTML = '<span class="ep-story-kicker">' + story.kicker + '</span>'
        + '<h3>' + story.title + '</h3>'
        + '<p>' + story.copy + '</p>'
        + '<a href="' + story.url + '" target="_blank" rel="noopener noreferrer">' + story.source + '</a>';
    }

    function renderDecayLink(element) {
      const host = document.getElementById('ep-decay');
      const z = element.number;
      const allUnstable = z === 43 || z === 61 || z >= 84;
      const special = { 6: 'Carbon-14 is radioactive and is the basis of radiocarbon dating.', 19: 'Potassium-40 is a naturally radioactive isotope inside your body and in bananas.' };
      if (!allUnstable && !special[z]) { host.hidden = true; host.innerHTML = ''; return; }
      host.hidden = false;
      host.innerHTML = '<strong>☢ Radioactive decay</strong><br>'
        + (allUnstable ? 'Every isotope of ' + element.name + ' is unstable. ' : special[z] + ' ')
        + 'See how alpha, beta and gamma decay move an atom around this table in <a href="radioactive-decay.html">Radioactive Decay</a>.';
    }

    function renderHistory(element) {
      const host = document.getElementById('ep-history');
      const h = (window.ELEMENT_HISTORY || {})[element.symbol];
      if (!h || !window.WORLD_LAND_PATH) { host.hidden = true; return; }
      host.hidden = false;
      const [year, who, place, lat, lon, approx, before, story] = h;
      const x = ((lon + 180) / 360 * 720).toFixed(1);
      const y = ((90 - lat) / 180 * 360).toFixed(1);
      const color = catColor(element.cat);
      let gridSvg = '';
      for (let lo = -150; lo <= 180; lo += 30) { const gx = (lo + 180) / 360 * 720; gridSvg += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="360"/>'; }
      for (let la = -60; la <= 60; la += 30) { const gy = (90 - la) / 180 * 360; gridSvg += '<line x1="0" y1="' + gy + '" x2="720" y2="' + gy + '"' + (la === 0 ? ' class="ep-map-eq"' : '') + '/>'; }
      const flip = Number(x) > 480;
      const label = '<text class="ep-map-label" x="' + (flip ? Number(x) - 12 : Number(x) + 12) + '" y="' + (Number(y) + 4) + '" text-anchor="' + (flip ? 'end' : 'start') + '">' + element.symbol + ' · ' + year + '</text>';
      const svg = '<svg class="ep-map" viewBox="0 0 720 360" role="img" aria-label="World map with a marker at ' + place + '">'
        + '<g class="ep-map-grid">' + gridSvg + '</g><path class="ep-map-land" d="' + window.WORLD_LAND_PATH + '"/>'
        + '<g class="' + (approx ? 'ep-ping-approx' : '') + '" style="--ping:' + color + '"><circle class="ep-ping-ring" cx="' + x + '" cy="' + y + '" r="7"/><circle class="ep-ping-ring r2" cx="' + x + '" cy="' + y + '" r="7"/><circle class="ep-ping-core" cx="' + x + '" cy="' + y + '" r="5.5"/></g>' + label + '</svg>';
      const facts = [[approx ? 'Earliest use' : 'First found', year], ['By', who], ['Where', place]]
        .map(([k, v]) => '<div class="ep-history-fact"><span>' + k + '</span><strong>' + v + '</strong></div>').join('');
      const note = approx
        ? 'Known since antiquity, so no single discovery moment exists. The ping marks a famous early source or the earliest well-documented use.'
        : 'The ping marks where the element was first identified or isolated as a distinct substance.';
      host.innerHTML = '<h3 class="ep-history-title">Where it was first discovered</h3><div class="ep-map-wrap">' + svg + '</div><div class="ep-history-facts">' + facts + '</div>'
        + '<div class="ep-history-text"><h4>Before it had a name: ancient history and uses</h4><p>' + before + '</p><h4>Discovery and classification</h4><p>' + story + '</p></div><p class="ep-history-note">' + note + '</p>';
    }

    function renderEarthProfile(element) {
      const earth = element.earth || getEarthProfile(element.symbol, element.cat, element.number);
      const activeSources = new Set(earth.sources || []);
      const sourceHtml = Object.entries(SOURCE_DEFS).map(([key, meta]) => {
        const active = activeSources.has(key);
        return '<span class="ep-source-pill' + (active ? ' is-active' : '') + '"><span class="ep-source-icon">' + SOURCE_ICONS[meta.icon] + '</span>' + meta.label + '</span>';
      }).join('');
      const flow = [
        ['Earth source', earth.occurrence],
        ['Common forms', (earth.forms || []).join('; ')],
        ['Production', earth.extraction],
        ['Role & context', earth.role || CATS[element.cat].label]
      ].map(([label, value]) => '<div class="ep-flow-step"><span class="ep-flow-label">' + label + '</span><span class="ep-flow-value">' + value + '</span></div>').join('');
      const items = (window.ELEMENT_IMAGES || {})[element.symbol] || [];
      const photoNote = items.length
        ? '<div class="ep-media-note"><span>' + items.length + ' verified photo' + (items.length === 1 ? '' : 's') + ' available for ' + element.name + '.</span><button type="button" class="ep-photo-jump" id="ep-jump-photos">View photos →</button></div>'
        : '';
      document.getElementById('ep-earth').innerHTML = '<h3 class="ep-earth-title">Where it is found on Earth</h3><div class="ep-source-grid">' + sourceHtml + '</div><div class="ep-flow">' + flow + '</div>' + photoNote;
      const jumpBtn = document.getElementById('ep-jump-photos');
      if (jumpBtn) jumpBtn.addEventListener('click', () => setInspectorTab('photos'));
    }

    function renderSupply(element) {
      const d = (window.ELEMENT_SUPPLY || {})[element.symbol] || {};
      const valid = (v) => v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0);
      const fmtNum = (v, suffix) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 7 }) : String(v)) + (suffix || '');
      const candidates = [
        ['Crustal abundance (ppm)', valid(d.crust) ? fmtNum(d.crust) : null],
        ['Recycling rate (%)', valid(d.recycling) ? fmtNum(d.recycling, '%') : null],
        ['Top 3 producers', valid(d.producers) ? d.producers.join(', ') : null],
        ['Production concentration', valid(d.prodConcentration) ? fmtNum(d.prodConcentration, '%') : null],
        ['Top 3 reserve holders', valid(d.reserveHolders) ? d.reserveHolders.join(', ') : null],
        ['Reserve concentration', valid(d.reserveDistribution) ? fmtNum(d.reserveDistribution, '%') : null]
      ].filter(([, v]) => v !== null);

      let bodyHtml = '';
      if (candidates.length) {
        bodyHtml += '<div class="ep-flow">' + candidates.map(([k, v]) => '<div class="ep-flow-step"><span class="ep-flow-label">' + k + '</span><span class="ep-flow-value">' + v + '</span></div>').join('') + '</div>';
      } else {
        const msg = (element.number >= 93 || element.number === 43 || element.number === 61)
          ? element.name + ' is synthesized in reactors or accelerators rather than mined as a natural commodity.'
          : 'No industrial mining commodity breakdown applies to ' + element.name + ' at crustal scale.';
        bodyHtml += '<div class="ep-media-note">' + msg + '</div>';
      }
      if (d.history) {
        bodyHtml += '<div class="ep-media-note"><strong>Through history:</strong> ' + d.history + '</div>';
      }
      if (candidates.length && window.ELEMENT_SUPPLY_ASOF) {
        bodyHtml += '<div class="ep-media-note">' + window.ELEMENT_SUPPLY_ASOF + '</div>';
      }
      document.getElementById('ep-supply').innerHTML = '<h3 class="ep-earth-title">Supply and sustainability</h3>' + bodyHtml;
    }

    function renderGallery(element) {
      const host = document.getElementById('ep-gallery');
      const items = (window.ELEMENT_IMAGES || {})[element.symbol] || [];
      if (!items.length) {
        let reason = 'No verified photographic sample is on file for ' + element.name + ' yet.';
        if (element.number >= 93) {
          reason = 'Transuranic and superheavy elements are synthetic — created inside particle accelerators and nuclear reactors only atoms at a time. Many decay in fractions of a second, making direct macro photography impossible.';
        } else if ([43, 61, 84, 85, 87].includes(element.number)) {
          reason = element.name + ' is extremely rare and intensely radioactive with a short half-life, so visible bulk samples are rarely photographed safely.';
        } else if (element.cat === 'ng') {
          reason = element.name + ' is a colorless, odorless gas under ordinary room conditions and is typically observed in sealed discharge tubes or cryogenic tanks.';
        }
        host.hidden = false;
        host.innerHTML = '<h3 class="ep-gallery-title">Photos and pictures</h3>'
          + '<div class="ep-empty-card">'
          + '<span class="ep-empty-icon">📷</span>'
          + '<p><strong>' + element.name + ' (' + element.symbol + ')</strong></p>'
          + '<p>' + reason + '</p></div>';
        return;
      }
      const kinds = { real: 'What it looks like', name: 'Behind the name' };
      const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      host.hidden = false;
      host.innerHTML = '<h3 class="ep-gallery-title">Photos and pictures</h3><div class="ep-gallery-grid">' + items.map((it) => {
        const url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(it.f) + '?width=480';
        const page = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(it.f);
        return '<figure class="ep-gallery-item" data-zoomable data-lightbox-group="ep-gallery" data-full="' + url.replace('width=480', 'width=1600') + '"><img src="' + url + '" alt="' + esc(it.c) + '" loading="lazy" />'
          + '<figcaption><span class="ep-gallery-kind">' + (kinds[it.k] || '') + '</span>' + esc(it.c)
          + '<span class="ep-gallery-credit">' + esc(it.a) + ' · ' + esc(it.l) + ' · <a href="' + page + '" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></span></figcaption></figure>';
      }).join('') + '</div>';
    }

    /* ── Pattern finder & Periodic Detective Practice ─── */
    const finderTabs = document.getElementById('pt-finder-tabs');
    const finderItems = document.getElementById('pt-finder-items');
    const finderOut = document.getElementById('pt-finder-out');
    const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118];
    const isF = (e) => e.cat === 'ln' || e.cat === 'ac';
    const periodOf = (e) => e.shells.length;
    const groupOf = (e) => (isF(e) ? null : e.col);
    const blockOf = (e) => {
      if (isF(e)) return 'f';
      if (e.symbol === 'He' || e.col <= 2) return 's';
      return e.col <= 12 ? 'd' : 'p';
    };

    const FAMILIES = {
      alkali: { label: 'Alkali metals (group 1)', test: (e) => e.col === 1 && e.number !== 1 && !isF(e), body: 'Soft, shiny, low-density metals with one outer electron. They lose it easily, so they react violently with water and are never found as pure metal in nature. Reactivity grows going down: Li fizzes, Na skitters and burns, K bursts into lilac flame, Cs explodes.', how: 'Look at the far-left column, skipping hydrogen (a nonmetal that only sits there because it has one outer electron).' },
      alkaline: { label: 'Alkaline earth metals (group 2)', test: (e) => e.col === 2 && !isF(e), body: 'Two outer electrons. Harder and denser than the alkali metals and a little less reactive. Calcium and magnesium build bones, shells and rocks; strontium and barium colour fireworks red and green.', how: 'Second column from the left.' },
      transition: { label: 'Transition metals (groups 3–12)', test: (e) => e.cat === 'tm', body: 'The central block of hard, dense, conductive metals: iron, copper, gold, titanium. Their d electrons let them form several charges and coloured compounds, which is why they make good catalysts, pigments and alloys.', how: 'The wide middle block, groups 3–12.' },
      pnictogen: { label: 'Pnictogens (group 15)', test: (e) => e.col === 15 && !isF(e), body: 'Five outer electrons. The group runs from nonmetals (N, P) through metalloids (As, Sb) to a metal (Bi), so one column can hold very different behaviour.', how: 'Nitrogen’s column, group 15.' },
      chalcogen: { label: 'Chalcogens (group 16)', test: (e) => e.col === 16 && !isF(e), body: 'Six outer electrons; they grab two more to fill the shell. Oxygen and sulfur are the “ore-formers”: most metal ores are oxides or sulfides.', how: 'Oxygen’s column, group 16.' },
      halogen: { label: 'Halogens (group 17)', test: (e) => e.cat === 'ha', body: 'One electron short of a full shell, so they are the most reactive nonmetals. “Halogen” means salt-former: they pair with alkali metals to make salts like NaCl. Reactivity falls going down: fluorine is fiercest, iodine is mild.', how: 'Second column from the right, group 17.' },
      noble: { label: 'Noble gases (group 18)', test: (e) => e.cat === 'ng', body: 'Full outer shells, so they almost never bond. That makes them ideal for lighting, welding shields and balloons. Their stability is the target every other element “wants” to reach by gaining, losing or sharing electrons.', how: 'The far-right column, group 18.' },
      metalloid: { label: 'Metalloids (the staircase)', test: (e) => e.cat === 'ml', body: 'B, Si, Ge, As, Sb, Te sit on the diagonal staircase between metals and nonmetals. They are semiconductors, so they make chips and solar cells possible.', how: 'Trace the zig-zag line from boron down to astatine; elements touching it are metalloids.' },
      lanthanide: { label: 'Lanthanides (rare earths, period 6)', test: (e) => e.cat === 'ln', body: 'Fifteen near-identical metals (La–Lu) because extra electrons go into an inner f subshell, not the outer shell. That similarity makes them hard to separate, and useful in magnets, lasers and phosphors.', how: 'The detached row at the bottom, upper strip.' },
      actinide: { label: 'Actinides (period 7)', test: (e) => e.cat === 'ac', body: 'Fifteen radioactive metals (Ac–Lr) including uranium and plutonium. All are unstable; the heavy ones exist only in laboratories.', how: 'The detached row at the bottom, lower strip.' }
    };

    const TRENDS = {
      across: { label: 'Across period 3 (Na → Ar)', symbols: ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'], body: 'Moving left to right, each atom adds a proton and an electron in the same shell. The stronger pull shrinks the atom, so atomic radius falls, while ionization energy and electronegativity rise. Metallic character fades: sodium is a soft reactive metal, silicon a semiconductor, chlorine a reactive nonmetal, argon an inert gas.', how: 'Ask: “Is it further right?” then expect smaller, more electron-hungry, less metallic.' },
      down: { label: 'Down group 1 (Li → Cs)', symbols: ['Li', 'Na', 'K', 'Rb', 'Cs'], body: 'Moving down a group, each element adds a whole new shell. Outer electrons sit farther out and are shielded by inner shells, so radius grows and ionization energy and electronegativity fall. For metals that means easier electron loss and higher reactivity; for halogens, the reverse (fluorine is most reactive).', how: 'Ask: “Is it further down?” then expect bigger, looser outer electrons.' },
      extremes: { label: 'The extremes', symbols: ['F', 'He', 'Cs', 'Fr'], body: 'Fluorine is the most electronegative element; helium has the highest ionization energy; caesium and francium sit at the bottom left as the largest atoms with the most weakly held electrons. The corners of the table are where trends peak.', how: 'Trends push toward the upper right (electron-hungry, tight, small) and the lower left (big, generous, reactive metal).' },
      diagonal: { label: 'Diagonal look-alikes', symbols: ['Li', 'Mg', 'Be', 'Al', 'B', 'Si'], body: 'Stepping one right and one down cancels two trends, so diagonal neighbours resemble each other: Li and Mg, Be and Al, B and Si. Beryllium and aluminium both form protective oxide layers and amphoteric compounds.', how: 'Look one step down-and-right of a small element for a chemical cousin.' }
    };

    function handlePracticeGuess(element) {
      const q = PRACTICE_QUESTIONS[practiceIndex];
      if (!q) return;
      const ok = q.test(element);
      practiceTotal++;
      if (ok) {
        practiceScore++;
        practiceFeedback = { ok: true, text: 'Correct! ' + element.name + ' (' + element.symbol + ') — ' + q.explain };
      } else {
        practiceFeedback = { ok: false, text: 'Not quite — ' + element.name + ' (' + element.symbol + ', Period ' + periodOf(element) + ', Group ' + (groupOf(element) || 'f-block') + ') doesn’t match. Try another element or tap Hint.' };
      }
      renderFinder();
    }

    function finderDefs(lens) {
      if (lens === 'period') {
        return [1, 2, 3, 4, 5, 6, 7].map((n) => {
          const first = n === 1 ? 1 : PERIOD_ENDS[n - 2] + 1, last = PERIOD_ENDS[n - 1];
          return { key: String(n), label: 'Period ' + n, test: (e) => periodOf(e) === n,
            title: 'Period ' + n + ': ' + (last - first + 1) + ' elements (' + (elements[first - 1] || {}).symbol + '–' + (elements[last - 1] || {}).symbol + ')',
            body: 'Every element in this row has its outer electrons in shell ' + n + ', so the period number equals the number of electron shells. Across the row, protons are added one at a time and the outer shell fills up: the row starts with a reactive metal and finishes with a noble gas' + (n === 1 ? ' (only H and He, since shell 1 holds just 2 electrons)' : n <= 3 ? ' (short row: 2 or 8 elements)' : n <= 5 ? ' (the d-block inserts ten transition metals, making the row 18 long)' : ' (the f-block inserts fourteen more, making the row 32 long)') + '.',
            how: 'Count the rows from the top, or count the electron shells in the atom model: shells = period.' };
        });
      }
      if (lens === 'group') {
        return Array.from({ length: 18 }, (_, i) => i + 1).map((g) => {
          const valence = g <= 2 ? g : g >= 13 ? g - 10 : null;
          return { key: String(g), label: 'Group ' + g, test: (e) => groupOf(e) === g,
            title: 'Group ' + g + (valence ? ': ' + valence + ' outer electron' + (valence > 1 ? 's' : '') : ': d-block transition metals'),
            body: valence
              ? 'Every element in this column has ' + (g === 18 ? '8 outer electrons (2 for helium)' : valence + ' outer (valence) electron' + (valence > 1 ? 's' : '')) + ', and valence electrons decide how an atom bonds. That is why the whole column reacts in a related way and forms similar compounds, for example NaCl and KCl, or H₂O and H₂S.'
              : 'Transition metals fill an inner d subshell, so neighbours are similar and the group number does not simply equal the outer electron count. Columns still share traits such as common charges and similar compounds.',
            how: 'Read the column number (1–18). Main-group shortcut: groups 1–2 have that many valence electrons; groups 13–18 have (group − 10).' };
        });
      }
      if (lens === 'block') {
        const B = {
          s: ['s-block', 'Groups 1–2 plus helium. The last electron enters an s subshell. Two columns wide, because an s subshell holds 2 electrons.'],
          p: ['p-block', 'Groups 13–18. The last electron enters a p subshell (6 electrons, so six columns). Contains nearly every nonmetal, all the metalloids and the halogens and noble gases.'],
          d: ['d-block', 'Groups 3–12, the transition metals. A d subshell holds 10 electrons, so the block is ten columns wide.'],
          f: ['f-block', 'Lanthanides and actinides. An f subshell holds 14 electrons, so each row has 14 (15 counting La/Ac or Lu/Lr). Drawn detached to keep the table narrow.']
        };
        return ['s', 'p', 'd', 'f'].map((b) => ({
          key: b, label: B[b][0], test: (e) => blockOf(e) === b, title: B[b][0], body: B[b][1],
          how: 'Block letters name the subshell being filled. Widths 2, 6, 10 and 14 are the subshell capacities.'
        }));
      }
      if (lens === 'family') {
        return Object.entries(FAMILIES).map(([key, f]) => ({ key, label: f.label.split(' (')[0], test: f.test, title: f.label, body: f.body, how: f.how }));
      }
      if (lens === 'trend') {
        return Object.entries(TRENDS).map(([key, t]) => ({ key, label: t.label, test: (e) => t.symbols.indexOf(e.symbol) >= 0, title: t.label, body: t.body, how: t.how }));
      }
      return [];
    }

    function renderFinder() {
      const lenses = [
        ['period', 'Periods (rows)'],
        ['group', 'Groups (columns)'],
        ['block', 'Blocks'],
        ['family', 'Families'],
        ['trend', 'Trends'],
        ['practice', 'Practice']
      ];
      finderTabs.innerHTML = '';
      lenses.forEach(([key, label]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pt-finder-btn'; b.textContent = label;
        b.setAttribute('aria-pressed', finderLens === key ? 'true' : 'false');
        b.addEventListener('click', () => {
          finderLens = finderLens === key ? null : key;
          finderItem = null;
          practiceFeedback = null;
          practiceShowHint = false;
          applyFinder();
        });
        finderTabs.appendChild(b);
      });

      finderItems.innerHTML = '';
      if (finderLens === 'practice') {
        patternFilter = null;
        const q = PRACTICE_QUESTIONS[practiceIndex];
        finderOut.innerHTML =
          '<div class="pt-quiz-head">'
          + '<h3>Periodic Detective (' + (practiceIndex + 1) + ' / ' + PRACTICE_QUESTIONS.length + ')</h3>'
          + '<span class="pt-quiz-score">Score: ' + practiceScore + ' / ' + practiceTotal + '</span>'
          + '</div>'
          + '<p class="pt-quiz-prompt">' + q.prompt + '</p>'
          + '<div class="pt-quiz-actions">'
          + '<button type="button" class="pt-finder-btn" id="pt-quiz-hint">' + (practiceShowHint ? 'Hide hint' : 'Hint') + '</button>'
          + '<button type="button" class="pt-finder-btn" id="pt-quiz-next">Next question →</button>'
          + '</div>'
          + (practiceShowHint ? '<p class="pt-quiz-feedback is-hint">Hint: ' + q.hint + '</p>' : '')
          + (practiceFeedback ? '<p class="pt-quiz-feedback ' + (practiceFeedback.ok ? 'is-correct' : 'is-wrong') + '">' + practiceFeedback.text + '</p>' : '<p>Click any element on the periodic table above to answer.</p>');

        const hintBtn = document.getElementById('pt-quiz-hint');
        if (hintBtn) hintBtn.addEventListener('click', () => { practiceShowHint = !practiceShowHint; renderFinder(); });
        const nextBtn = document.getElementById('pt-quiz-next');
        if (nextBtn) nextBtn.addEventListener('click', () => {
          practiceIndex = (practiceIndex + 1) % PRACTICE_QUESTIONS.length;
          practiceFeedback = null;
          practiceShowHint = false;
          renderFinder();
        });
        return;
      }

      const defs = finderLens ? finderDefs(finderLens) : [];
      defs.forEach((d) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pt-finder-btn'; b.textContent = d.label;
        b.setAttribute('aria-pressed', finderItem === d.key ? 'true' : 'false');
        b.addEventListener('click', () => { finderItem = finderItem === d.key ? null : d.key; applyFinder(); });
        finderItems.appendChild(b);
      });
      const cur = defs.find((d) => d.key === finderItem);
      patternFilter = cur ? cur.test : null;
      if (cur) {
        const count = elements.filter(cur.test).length;
        finderOut.innerHTML = '<h3>' + cur.title + '</h3><p>' + cur.body + '</p><p><span class="pt-finder-how">How to identify it:</span> ' + cur.how + '</p><p>' + count + ' element' + (count === 1 ? '' : 's') + ' highlighted on the table.</p>';
      } else {
        finderOut.innerHTML = '<p>' + (finderLens ? 'Choose an item above (or click any row/column header on the table).' : 'Start with a lens above or click any Group (1–18) or Period (1–7) header on the table. <strong>Practice</strong> challenges you to locate elements using table patterns.') + '</p>';
      }
    }

    function applyFinder() { renderFinder(); updateGrid(); }

    function showElement(element, shouldScroll) {
      selectedSymbol = element.symbol;
      const state = getState(element, currentTemp);
      const color = catColor(element.cat);
      const badgeBg = catColor(element.cat, true);
      renderAtomModel(element, color);
      renderCrystal(element, color);
      document.getElementById('ep-crystal-tag').textContent = element.crystal.label;
      document.getElementById('ep-sym').textContent = element.symbol;
      document.getElementById('ep-sym').style.color = color;
      document.getElementById('ep-name').textContent = element.name;
      document.getElementById('ep-num').textContent = element.number;
      document.getElementById('ep-mass').textContent = element.mass;
      document.getElementById('ep-badge').textContent = CATS[element.cat].label;
      document.getElementById('ep-badge').style.background = badgeBg;
      readableInk(document.getElementById('ep-badge'), badgeBg);
      document.getElementById('ep-state').textContent = getStateLabel(state) + ' at ' + currentTemp + ' K';
      document.getElementById('ep-config').textContent = element.electronConfig || element.shells.map((count, index) => 'Shell ' + (index + 1) + ': ' + count + 'e⁻').join(' · ');
      document.getElementById('ep-desc').textContent = element.summary || element.description;

      if (epPrev && epNext) {
        const prevEl = elements.find((e) => e.number === element.number - 1);
        const nextEl = elements.find((e) => e.number === element.number + 1);
        if (prevEl) {
          epPrev.disabled = false;
          epPrev.textContent = '← ' + prevEl.symbol + ' (' + prevEl.number + ')';
          epPrev.title = 'Previous element: ' + prevEl.name + ' (' + prevEl.number + ')';
        } else {
          epPrev.disabled = true;
          epPrev.textContent = '← Prev';
          epPrev.title = 'First element';
        }
        if (nextEl) {
          epNext.disabled = false;
          epNext.textContent = nextEl.symbol + ' (' + nextEl.number + ') →';
          epNext.title = 'Next element: ' + nextEl.name + ' (' + nextEl.number + ')';
        } else {
          epNext.disabled = true;
          epNext.textContent = 'Next →';
          epNext.title = 'Last element';
        }
      }

      renderStats(element);
      renderUsage(element);
      renderStory(element);
      renderDecayLink(element);
      renderHistory(element);
      renderEarthProfile(element);
      renderSupply(element);
      renderGallery(element);
      if (!detailPanel.classList.contains('ep-open')) {
        detailPanel.classList.add('ep-open');
      }
      updateGrid();
      if (shouldScroll) detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function closePanel() {
      selectedSymbol = null;
      detailPanel.classList.remove('ep-open');
      updateGrid();
    }

    function updateStateCounts() {
      const counts = { solid: 0, liquid: 0, gas: 0, unknown: 0 };
      elements.forEach((e) => { counts[getState(e, currentTemp)]++; });
      if (stateCounts) {
        stateCounts.textContent = counts.solid + 'S · ' + counts.liquid + 'L · ' + counts.gas + 'G';
        stateCounts.title = counts.solid + ' solid, ' + counts.liquid + ' liquid, ' + counts.gas + ' gas, ' + counts.unknown + ' predicted';
      }
      if (tempCounts) {
        tempCounts.innerHTML =
          '<span class="pt-temp-count-chip is-solid"><i></i>' + counts.solid + ' Solid</span>'
          + '<span class="pt-temp-count-chip is-liquid"><i></i>' + counts.liquid + ' Liquid</span>'
          + '<span class="pt-temp-count-chip is-gas"><i></i>' + counts.gas + ' Gas</span>'
          + (counts.unknown ? '<span class="pt-temp-count-chip is-unknown"><i></i>' + counts.unknown + ' Predicted</span>' : '');
      }
    }

    function renderTemperatureReadout() {
      tempReadout.textContent = currentTemp + ' K';
      tempInput.value = String(currentTemp);
      if (quickTemp) quickTemp.value = String(currentTemp);
      if (quickTempBtn) quickTempBtn.textContent = currentTemp + ' K';
      tempStateReadout.textContent = getStateSubtitle();

      if (tempEquiv) {
        const c = Math.round(currentTemp - 273.15);
        const f = Math.round((currentTemp - 273.15) * 9 / 5 + 32);
        tempEquiv.textContent = c + ' °C · ' + f + ' °F';
      }

      tempChips.forEach((chip) => {
        const target = Number(chip.dataset.temp);
        chip.classList.toggle('is-active', Math.abs(currentTemp - target) <= 1);
      });
      updateStateCounts();
    }

    function onTemperatureChange(nextTemp) {
      currentTemp = Math.max(0, Math.min(4000, Number(nextTemp) || 0));
      renderTemperatureReadout();
      updateGrid();
      if (selectedSymbol) {
        const el = elements.find((e) => e.symbol === selectedSymbol);
        if (el) {
          const state = getState(el, currentTemp);
          document.getElementById('ep-state').textContent = getStateLabel(state) + ' at ' + currentTemp + ' K';
          renderStats(el);
          renderCrystal(el, catColor(el.cat));
        }
      }
    }

    tempChips.forEach((chip) => {
      chip.addEventListener('click', () => onTemperatureChange(Number(chip.dataset.temp)));
    });
    if (tempInput) tempInput.addEventListener('input', (e) => onTemperatureChange(e.target.value));
    if (quickTemp) quickTemp.addEventListener('input', (e) => onTemperatureChange(e.target.value));
    if (quickTempBtn) quickTempBtn.addEventListener('click', () => onTemperatureChange(295));

    function updateCommandSelection() {
      const domItems = commandList.querySelectorAll('.pt-command-item');
      domItems.forEach((btn, idx) => {
        const isSel = idx === commandSelectedIndex;
        btn.classList.toggle('is-focused', isSel);
        if (isSel) btn.scrollIntoView({ block: 'nearest' });
      });
    }

    function renderCommandList(filter) {
      const needle = String(filter || '').trim().toLowerCase();
      let items = [];

      if (needle) {
        const exactSym = elements.find((e) => e.symbol.toLowerCase() === needle);
        const exactNum = elements.find((e) => String(e.number) === needle);
        const nameStarts = elements.filter((e) => e.name.toLowerCase().startsWith(needle) && e !== exactSym && e !== exactNum);
        const symStarts = elements.filter((e) => e.symbol.toLowerCase().startsWith(needle) && e !== exactSym && !nameStarts.includes(e));
        const nameIncludes = elements.filter((e) => e.name.toLowerCase().includes(needle) && e !== exactSym && !nameStarts.includes(e) && !symStarts.includes(e));

        const matchedElements = [exactSym, exactNum, ...nameStarts, ...symStarts, ...nameIncludes].filter(Boolean).slice(0, 6);
        matchedElements.forEach((el) => {
          items.push({
            type: 'element',
            symbol: el.symbol,
            title: el.name + ' (' + el.symbol + ', Z=' + el.number + ')',
            subtitle: CATS[el.cat].label + ' · ' + el.mass + ' amu · ' + getStateLabel(getState(el, currentTemp)),
            color: CATS[el.cat].color
          });
        });

        Object.entries(CATS).forEach(([k, catMeta]) => {
          if (catMeta.label.toLowerCase().includes(needle) || k === needle) {
            items.push({
              type: 'category',
              cat: k,
              title: 'Filter: ' + catMeta.label,
              subtitle: 'Highlight all ' + catMeta.label + ' elements on the table',
              color: catMeta.color
            });
          }
        });
      }

      const matchedCmds = COMMANDS.filter((cmd) => !needle || cmd.label.includes(needle) || cmd.note.toLowerCase().includes(needle));
      matchedCmds.forEach((cmd) => {
        items.push({
          type: 'topic',
          command: cmd.label,
          title: cmd.label,
          subtitle: cmd.note,
          color: '#0071e3'
        });
      });

      lastRenderedCommandItems = items;
      commandSelectedIndex = items.length ? 0 : -1;

      if (!items.length) {
        commandList.innerHTML = '<div class="pt-command-empty">No results found for “' + needle + '”. Try an element name, symbol (Fe), atomic number (26), or topic (batteries, chips).</div>';
        return;
      }

      commandList.innerHTML = items.map((item, idx) => {
        if (item.type === 'element') {
          return '<button class="pt-command-item is-element' + (idx === 0 ? ' is-focused' : '') + '" type="button" data-cmd-idx="' + idx + '">'
            + '<span class="pt-cmd-badge" style="background:' + item.color + '">' + item.symbol + '</span>'
            + '<div><strong>' + item.title + '</strong><small>' + item.subtitle + '</small></div></button>';
        }
        return '<button class="pt-command-item' + (idx === 0 ? ' is-focused' : '') + '" type="button" data-cmd-idx="' + idx + '">'
          + '<strong>' + (item.type === 'category' ? '🏷️ ' : '🔬 ') + item.title + '</strong><small>' + item.subtitle + '</small></button>';
      }).join('');
    }

    function openCommandPalette() {
      commandRoot.classList.add('is-open');
      commandRoot.setAttribute('aria-hidden', 'false');
      commandInput.value = '';
      renderCommandList('');
      setTimeout(() => commandInput.focus(), 0);
    }

    function closeCommandPalette() {
      commandRoot.classList.remove('is-open');
      commandRoot.setAttribute('aria-hidden', 'true');
    }

    function executeCommandItem(item) {
      if (!item) return;
      closeCommandPalette();
      if (item.type === 'element') {
        const el = elements.find((e) => e.symbol === item.symbol);
        if (el) {
          showElement(el, true);
          const entry = cellBySymbol.get(el.symbol);
          if (entry) entry.cell.focus({ preventScroll: true });
        }
      } else if (item.type === 'category') {
        activeCat = item.cat;
        renderAll();
      } else if (item.type === 'topic') {
        applyCommand(item.command);
      }
    }

    function applyCommand(label) {
      const command = COMMANDS.find((entry) => entry.label === label);
      if (!command) return;
      commandMatches = new Set(command.symbols);
      commandStatus.textContent = 'Command "' + command.label + '" highlighting ' + command.symbols.join(', ') + '.';
      const lead = elements.find((entry) => commandMatches.has(entry.symbol));
      closeCommandPalette();
      updateGrid();
      if (lead) showElement(lead, true);
    }

    function clearCommandHighlight() {
      commandMatches = new Set();
      commandStatus.textContent = 'Try “batteries”, “balloons”, or “chips”.';
      updateGrid();
    }

    /* ── Inspector tabs ───────────────────────────────── */
    function setInspectorTab(key) {
      detailPanel.dataset.tabActive = key;
      detailPanel.querySelectorAll('.ep-tab-btn').forEach((btn) => {
        btn.setAttribute('aria-selected', btn.dataset.tabKey === key ? 'true' : 'false');
      });
    }

    const dashboard = document.getElementById('pt-dash');
    function isSideBySide() {
      return getComputedStyle(dashboard).display === 'grid';
    }

    (function buildInspectorTabs() {
      const tabs = [['stats', 'Stats'], ['crystal', 'Crystal'], ['atom', 'Atom'], ['uses', 'Uses'], ['earth', 'Earth & supply'], ['history', 'History'], ['photos', 'Photos']];
      const bar = document.createElement('div');
      bar.className = 'ep-tabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Element detail sections');
      tabs.forEach(([key, label]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'ep-tab-btn'; b.textContent = label; b.dataset.tabKey = key;
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', key === 'stats' ? 'true' : 'false');
        b.addEventListener('click', () => setInspectorTab(key));
        bar.appendChild(b);
      });
      bar.addEventListener('keydown', (event) => {
        const buttons = Array.from(bar.querySelectorAll('.ep-tab-btn'));
        const index = buttons.indexOf(document.activeElement);
        if (index === -1) return;
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          const next = buttons[(index + 1) % buttons.length];
          next.focus(); next.click();
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          const prev = buttons[(index - 1 + buttons.length) % buttons.length];
          prev.focus(); prev.click();
        } else if (event.key === 'Home') {
          event.preventDefault();
          buttons[0].focus(); buttons[0].click();
        } else if (event.key === 'End') {
          event.preventDefault();
          buttons[buttons.length - 1].focus(); buttons[buttons.length - 1].click();
        }
      });
      detailPanel.insertBefore(bar, detailPanel.firstChild);
    })();

    function initCompareMode() {
      if (!epCompareSelect) return;
      epCompareSelect.innerHTML = '<option value="">Choose an element to compare…</option>'
        + elements.map((e) => '<option value="' + e.symbol + '">' + e.number + '. ' + e.name + ' (' + e.symbol + ')</option>').join('');

      if (epCompareBtn) {
        epCompareBtn.addEventListener('click', () => {
          compareMode = !compareMode;
          epCompareBtn.classList.toggle('is-active', compareMode);
          epCompareBtn.setAttribute('aria-expanded', compareMode ? 'true' : 'false');
          if (epCompareTray) epCompareTray.hidden = !compareMode;
          if (compareMode) {
            setInspectorTab('stats');
            if (!compareSymbol && selectedSymbol) {
              const cur = elements.find((e) => e.symbol === selectedSymbol);
              const partner = elements.find((e) => e.col === cur.col && e.number !== cur.number)
                || elements.find((e) => e.number === (cur.number === 118 ? 1 : cur.number + 1));
              if (partner) {
                compareSymbol = partner.symbol;
                epCompareSelect.value = partner.symbol;
              }
            }
          }
          updateGrid();
          if (selectedSymbol) {
            const cur = elements.find((e) => e.symbol === selectedSymbol);
            if (cur) renderStats(cur);
          }
        });
      }

      epCompareSelect.addEventListener('change', (event) => {
        compareSymbol = event.target.value || null;
        updateGrid();
        if (selectedSymbol) {
          const cur = elements.find((e) => e.symbol === selectedSymbol);
          if (cur) renderStats(cur);
        }
      });

      if (epCompareSwap) {
        epCompareSwap.addEventListener('click', () => {
          if (!selectedSymbol || !compareSymbol) return;
          const prevPrimary = selectedSymbol;
          const nextPrimary = elements.find((e) => e.symbol === compareSymbol);
          if (!nextPrimary) return;
          compareSymbol = prevPrimary;
          epCompareSelect.value = prevPrimary;
          showElement(nextPrimary, false);
        });
      }

      if (epCompareClose) {
        epCompareClose.addEventListener('click', () => {
          compareMode = false;
          compareSymbol = null;
          if (epCompareBtn) {
            epCompareBtn.classList.remove('is-active');
            epCompareBtn.setAttribute('aria-expanded', 'false');
          }
          if (epCompareTray) epCompareTray.hidden = true;
          updateGrid();
          if (selectedSymbol) {
            const cur = elements.find((e) => e.symbol === selectedSymbol);
            if (cur) renderStats(cur);
          }
        });
      }
    }

    if (epPrev) {
      epPrev.addEventListener('click', () => {
        const curr = elements.find((e) => e.symbol === selectedSymbol);
        if (curr && curr.number > 1) {
          const prev = elements.find((e) => e.number === curr.number - 1);
          if (prev) {
            showElement(prev, false);
            const entry = cellBySymbol.get(prev.symbol);
            if (entry) entry.cell.focus({ preventScroll: true });
          }
        }
      });
    }

    if (epNext) {
      epNext.addEventListener('click', () => {
        const curr = elements.find((e) => e.symbol === selectedSymbol);
        if (curr && curr.number < 118) {
          const next = elements.find((e) => e.number === curr.number + 1);
          if (next) {
            showElement(next, false);
            const entry = cellBySymbol.get(next.symbol);
            if (entry) entry.cell.focus({ preventScroll: true });
          }
        }
      });
    }

    function ensureDefaultSelection() {
      if (isSideBySide() && !selectedSymbol && elements.length) showElement(elements.find((e) => e.symbol === 'Fe') || elements[0], false);
    }
    new ResizeObserver(ensureDefaultSelection).observe(dashboard);

    function renderAll() {
      renderCategoryControls();
      renderLegend();
      renderHeatmapControls();
      renderTemperatureReadout();
      renderFinder();
      updateGrid();
      if (selectedSymbol) {
        const element = elements.find((entry) => entry.symbol === selectedSymbol);
        if (element) showElement(element, false);
      }
      ensureDefaultSelection();
    }

    function syncSearchQuery(value, sourceEl) {
      searchQ = String(value || '').toLowerCase().trim();
      if (searchInput && sourceEl !== searchInput) searchInput.value = value;
      if (quickSearch && sourceEl !== quickSearch) quickSearch.value = value;
      if (!searchQ && commandMatches.size) clearCommandHighlight();
      updateGrid();
    }

    [searchInput, quickSearch].forEach((inputEl) => {
      if (!inputEl) return;
      inputEl.addEventListener('input', (event) => syncSearchQuery(event.target.value, inputEl));
      inputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const firstMatch = elements.find(matchesFilters);
          if (firstMatch) {
            showElement(firstMatch, true);
            const entry = cellBySymbol.get(firstMatch.symbol);
            if (entry) entry.cell.focus({ preventScroll: true });
          }
        } else if (event.key === 'Escape') {
          syncSearchQuery('', null);
        }
      });
    });

    if (quickLens) {
      quickLens.addEventListener('change', (event) => {
        activeHeatmap = event.target.value || 'none';
        renderAll();
      });
    }
    if (quickCmd) quickCmd.addEventListener('click', openCommandPalette);
    if (quickControls) {
      quickControls.addEventListener('click', () => {
        if (window.LessonLayout && typeof window.LessonLayout.openPanel === 'function') {
          window.LessonLayout.openPanel(true);
        }
      });
    }

    atomModelButtons.forEach((button) => {
      button.addEventListener('click', () => {
        atomModel = button.dataset.atomModel || 'bohr';
        if (selectedSymbol) {
          const element = elements.find((entry) => entry.symbol === selectedSymbol);
          if (element) renderAtomModel(element, catColor(element.cat));
        } else {
          atomModelButtons.forEach((entry) => entry.setAttribute('aria-pressed', entry === button ? 'true' : 'false'));
        }
      });
    });

    if (atomMotionBtn) {
      atomMotionBtn.addEventListener('click', () => {
        atomPaused = !atomPaused;
        atomMotionBtn.setAttribute('aria-pressed', atomPaused ? 'true' : 'false');
        atomMotionBtn.textContent = atomPaused ? 'Play' : 'Pause';
        if (bohrSvg) bohrSvg.classList.toggle('is-paused', atomPaused);
      });
    }

    const epCloseBtn = document.getElementById('ep-close');
    if (epCloseBtn) epCloseBtn.addEventListener('click', closePanel);
    commandOpen.addEventListener('click', openCommandPalette);
    commandClose.addEventListener('click', closeCommandPalette);
    commandBackdrop.addEventListener('click', closeCommandPalette);
    commandInput.addEventListener('input', (event) => renderCommandList(event.target.value));
    commandInput.addEventListener('keydown', (event) => {
      if (!lastRenderedCommandItems.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        commandSelectedIndex = (commandSelectedIndex + 1) % lastRenderedCommandItems.length;
        updateCommandSelection();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        commandSelectedIndex = (commandSelectedIndex - 1 + lastRenderedCommandItems.length) % lastRenderedCommandItems.length;
        updateCommandSelection();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (commandSelectedIndex >= 0 && commandSelectedIndex < lastRenderedCommandItems.length) {
          executeCommandItem(lastRenderedCommandItems[commandSelectedIndex]);
        }
      }
    });
    commandList.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-cmd-idx]');
      if (btn) {
        const idx = Number(btn.dataset.cmdIdx);
        if (lastRenderedCommandItems[idx]) executeCommandItem(lastRenderedCommandItems[idx]);
      }
    });

    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openCommandPalette();
        return;
      }
      if (event.key === 'Escape') {
        if (event.defaultPrevented || document.querySelector('.plb.plb-open')) return;
        if (commandRoot.classList.contains('is-open')) closeCommandPalette();
        else if (selectedSymbol && !isSideBySide()) closePanel();
        return;
      }
      const tag = (event.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (event.key === '[' || event.key === ']') {
        event.preventDefault();
        const curr = elements.find((e) => e.symbol === selectedSymbol) || elements[0];
        const nextZ = event.key === ']' ? curr.number + 1 : curr.number - 1;
        const targetEl = elements.find((e) => e.number === nextZ);
        if (targetEl) {
          showElement(targetEl, false);
          const entry = cellBySymbol.get(targetEl.symbol);
          if (entry) entry.cell.focus({ preventScroll: true });
        }
      }
    });

    /* React live to site theme / lighting changes */
    function refreshForThemeChange() {
      renderCategoryControls();
      renderLegend();
      updateGrid();
      if (selectedSymbol) {
        const cur = elements.find((e) => e.symbol === selectedSymbol);
        if (cur) {
          const color = catColor(cur.cat);
          document.getElementById('ep-sym').style.color = color;
          renderAtomModel(cur, color);
          renderCrystal(cur, color);
          renderHistory(cur);
        }
      }
    }

    window.addEventListener('classroomos:lightingchange', refreshForThemeChange);
    window.addEventListener('classroomos:themechange', refreshForThemeChange);
    new MutationObserver(refreshForThemeChange).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-lighting', 'data-theme']
    });

    rebuildElements();
    initCompareMode();
    renderAll();
    loadReferenceData();
  })();
