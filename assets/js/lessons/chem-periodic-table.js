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
    /* ── Categories ───────────────────────────────────── */
    const CATS = {
      ak: { label: 'Alkali Metal',     color: '#c0392b' },
      ae: { label: 'Alkaline Earth',   color: '#d35400' },
      tm: { label: 'Transition Metal', color: '#b7791f' },
      pt: { label: 'Post-Transition',  color: '#27ae60' },
      ml: { label: 'Metalloid',        color: '#2471a3' },
      nm: { label: 'Nonmetal',         color: '#1a5276' },
      ha: { label: 'Halogen',          color: '#7d3c98' },
      ng: { label: 'Noble Gas',        color: '#b03a78' },
      ln: { label: 'Lanthanide',       color: '#148f77' },
      ac: { label: 'Actinide',         color: '#7e5109' },
    };

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
      [112,'Cn','Copernicium',285,'tm',[2,8,18,32,32,18,2],12,7,'Named after Nicolaus Copernicus. Relativistic effects are so strong in this heavy element that it may behave more like a gas than a metal at room temperature.'],
      [113,'Nh','Nihonium',286,'pt',[2,8,18,32,32,18,3],13,7,'Named after "Nihon" (Japan in Japanese), making it the first element discovered in Asia. Officially confirmed and named in 2016.'],
      [114,'Fl','Flerovium',289,'pt',[2,8,18,32,32,18,4],14,7,'Named after the Flerov Laboratory in Russia. May be a gas or volatile liquid at room temperature — potentially the most inert metal if it is a metal at all.'],
      [115,'Mc','Moscovium',290,'pt',[2,8,18,32,32,18,5],15,7,'Named after Moscow Oblast. First synthesized in 2003 by a Russian-American collaboration. Decays in milliseconds into nihonium.'],
      [116,'Lv','Livermorium',293,'pt',[2,8,18,32,32,18,6],16,7,'Named after Lawrence Livermore National Laboratory in California. One of the heaviest elements ever created. Decays almost instantly into flerovium.'],
      [117,'Ts','Tennessine',294,'ha',[2,8,18,32,32,18,7],17,7,'Named after Tennessee, home to Oak Ridge National Laboratory, Vanderbilt, and UT. First synthesized in 2010 and officially named by IUPAC in 2016. Only a handful of atoms have ever been observed.'],
      [118,'Og','Oganesson',294,'ng',[2,8,18,32,32,18,8],18,7,'Named after physicist Yuri Oganessian. The heaviest confirmed element and the only period-7 noble gas. May actually be a solid at room temperature.'],
    ];

    const PROPERTY_SOURCE_URL = 'https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json';
    const PROPERTY_CACHE_KEY = 'classroomos-periodic-ref-v1';
    const HEATMAPS = {
      none: { label: 'Category', tint: 'rgba(0,113,227,0.12)' },
      density: { label: 'Density', tint: 'hsla(205, 100%, 52%, VAR)' },
      electronegativity: { label: 'Electronegativity', tint: 'hsla(286, 92%, 58%, VAR)' },
      rarity: { label: 'Rarity', tint: 'hsla(44, 100%, 52%, VAR)' }
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
      crust: { label: "Crust", icon: "rock" },
      ocean: { label: "Ocean", icon: "water" },
      air: { label: "Air", icon: "gas" },
      life: { label: "Life", icon: "bio" },
      synthetic: { label: "Synthetic", icon: "lab" }
    };
    const SOURCE_ICONS = { rock: "◆", water: "≈", gas: "○", bio: "✚", lab: "⚗" };
    const CATEGORY_EARTH = {
      ak: { sources: ["crust", "ocean"], forms: ["salts and reactive minerals"], extraction: "Separated from mineral salts or molten compounds", occurrence: "Too reactive to occur as pure metal in nature", mediaPrompt: "Photograph a mineral salt, stored metal sample, or everyday battery use." },
      ae: { sources: ["crust", "ocean", "life"], forms: ["carbonates, sulfates, silicates"], extraction: "Mined from minerals, then refined chemically or electrolytically", occurrence: "Commonly locked inside rocks, shells, bones, or seawater salts", mediaPrompt: "Photograph a mineral, shell, bone-safe classroom model, or refined sample." },
      tm: { sources: ["crust"], forms: ["ores, native metals, alloys"], extraction: "Mined as ore, concentrated, smelted, and refined", occurrence: "Usually found in oxide, sulfide, or carbonate ores", mediaPrompt: "Photograph an ore specimen, native metal, alloy, or engineered object." },
      pt: { sources: ["crust"], forms: ["ores, oxides, sulfides, alloys"], extraction: "Recovered from ores or as byproducts of other metal refining", occurrence: "Often found dispersed through crustal minerals", mediaPrompt: "Photograph an ore, refined sample, crystal, or common product." },
      ml: { sources: ["crust"], forms: ["silicates, oxides, sulfides, semiconductors"], extraction: "Mined from minerals and purified for glass, alloy, or semiconductor use", occurrence: "Concentrated in specific minerals rather than pure deposits", mediaPrompt: "Photograph a mineral, wafer, glass, or semiconductor form." },
      nm: { sources: ["crust", "air", "ocean", "life"], forms: ["gases, minerals, biomolecules, molecular solids"], extraction: "Collected from air, mined compounds, water, or biological materials depending on the element", occurrence: "Often cycles through air, water, rocks, and living systems", mediaPrompt: "Photograph a pure sample where safe, mineral form, gas container, or biological/common form." },
      ha: { sources: ["crust", "ocean"], forms: ["salts and halide minerals"], extraction: "Separated from brines, seawater, or halide minerals", occurrence: "Highly reactive, so natural forms are usually compounds", mediaPrompt: "Photograph a safe salt, mineral, antiseptic, or sealed sample." },
      ng: { sources: ["air"], forms: ["trace atmospheric gases"], extraction: "Separated by fractional distillation of liquefied air", occurrence: "Mostly found as individual atoms in the atmosphere", mediaPrompt: "Photograph a discharge tube, lighting use, gas cylinder, or balloon context." },
      ln: { sources: ["crust"], forms: ["rare-earth minerals such as monazite and bastnasite"], extraction: "Mined from rare-earth ores, then separated by solvent extraction and ion exchange", occurrence: "Not usually rare individually, but hard to separate from similar neighbors", mediaPrompt: "Photograph a rare-earth mineral, magnet, phosphor, lens, or refined oxide." },
      ac: { sources: ["crust", "synthetic"], forms: ["radioactive minerals, reactor products, accelerator-made atoms"], extraction: "Recovered from uranium/thorium ores or produced in reactors and accelerators", occurrence: "Heavy actinides are radioactive; many are synthetic or exist only in trace amounts", mediaPrompt: "Use public-domain lab, detector, ore, or reactor-context images instead of unsafe samples." }
    };
    const ELEMENT_EARTH = {
      H: { sources: ["ocean", "air", "life"], forms: ["water, hydrocarbons, organic molecules"], extraction: "Produced from water electrolysis or natural gas reforming", occurrence: "Earth holds most hydrogen bound in water and organic compounds", mediaPrompt: "Use water, a fuel cell, or a gas discharge tube image." },
      He: { sources: ["air", "crust"], forms: ["natural gas deposits, trace atmosphere"], extraction: "Recovered from helium-rich natural gas", occurrence: "Light helium escapes the atmosphere, so usable helium comes from underground gas fields", mediaPrompt: "Use a balloon, cryogenic tank, or discharge tube image." },
      C: { sources: ["crust", "air", "life"], forms: ["graphite, diamond, carbon dioxide, limestone, living tissue"], extraction: "Mined as graphite or diamond, and cycled biologically as carbon compounds", occurrence: "Carbon moves through rocks, air, oceans, and living organisms", mediaPrompt: "Use graphite, diamond, charcoal, limestone, or plant matter." },
      O: { sources: ["air", "ocean", "crust", "life"], forms: ["oxygen gas, water, oxides, silicates"], extraction: "Separated from liquefied air or produced by electrolysis of water", occurrence: "The most abundant element in Earth crust by mass and essential in water and air", mediaPrompt: "Use liquid oxygen, water, oxide minerals, or breathing/medical oxygen imagery." },
      Na: { sources: ["ocean", "crust"], forms: ["halite, seawater salts, sodium minerals"], extraction: "Produced by electrolysis of molten sodium chloride", occurrence: "Common in seawater and evaporite salt deposits", mediaPrompt: "Use halite, table salt, or a sealed sodium sample." },
      Al: { sources: ["crust"], forms: ["bauxite, aluminosilicate minerals"], extraction: "Refined from bauxite to alumina, then electrolyzed by the Hall-Heroult process", occurrence: "The most abundant metal in Earth crust, but almost never native", mediaPrompt: "Use bauxite, aluminum metal, foil, aircraft, or cans." },
      Si: { sources: ["crust"], forms: ["quartz, sand, silicate rocks, silicon wafers"], extraction: "Reduced from silica and purified for electronics or solar cells", occurrence: "Extremely abundant in rocks and sand as silicate minerals", mediaPrompt: "Use quartz, sand, a wafer, solar cell, or chip image." },
      Fe: { sources: ["crust"], forms: ["hematite, magnetite, iron meteorites, steel"], extraction: "Smelted from iron ore in blast furnaces or direct-reduction systems", occurrence: "Common in crustal ores and dominant in Earth core", mediaPrompt: "Use hematite, magnetite, steel, rust, or meteorite images." },
      Cu: { sources: ["crust"], forms: ["native copper, chalcopyrite, malachite, copper wiring"], extraction: "Mined from sulfide and oxide ores, then smelted or leached", occurrence: "Found in ore bodies and sometimes as native metal", mediaPrompt: "Use native copper, malachite, chalcopyrite, or wiring." },
      Au: { sources: ["crust"], forms: ["native gold, placer deposits, quartz veins"], extraction: "Mined from hard-rock veins or placer sediments, then refined", occurrence: "Often found as native metal because it resists reaction", mediaPrompt: "Use native gold, flakes, nuggets, or electronics contacts." },
      Hg: { sources: ["crust"], forms: ["cinnabar ore, liquid mercury"], extraction: "Roasted from cinnabar ore and condensed as liquid metal", occurrence: "Mostly found as mercury sulfide; toxic forms can move through ecosystems", mediaPrompt: "Use cinnabar or sealed educational/sample imagery only." },
      U: { sources: ["crust"], forms: ["uraninite, carnotite, uranium oxides"], extraction: "Mined from uranium ores, milled, converted, and enriched for some uses", occurrence: "Naturally radioactive and dispersed through crustal rocks", mediaPrompt: "Use uranium ore, fuel pellet diagrams, or public-domain lab images." }
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

    const grid = document.getElementById('pt-grid');
    const legend = document.getElementById('pt-legend');
    const ctrl = document.getElementById('pt-controls');
    const tempInput = document.getElementById('pt-temp');
    const tempReadout = document.getElementById('pt-temp-readout');
    const tempStateReadout = document.getElementById('pt-temp-state-readout');
    const heatmapWrap = document.getElementById('pt-heatmap');
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

    const BASE_ELEMENTS = EL.map(([number, symbol, name, mass, cat, shells, col, row, description]) => ({ number, symbol, name, mass, cat, shells, col, row, description }));

    let propertyRefBySymbol = {};
    let elements = [];
    let selectedSymbol = null;
    let activeCat = 'all';
    let isolatedCat = null;
    let searchQ = '';
    let activeHeatmap = 'none';
    let currentTemp = Number(tempInput.value || 295);
    let commandMatches = new Set();
    let atomModel = 'bohr';
    let patternFilter = null;

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
      return Number.isFinite(Number(value)) ? Number(value) : null;
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
      try {
        const cached = localStorage.getItem(PROPERTY_CACHE_KEY);
        if (cached) {
          propertyRefBySymbol = JSON.parse(cached);
          dataNote.textContent = 'Using cached lab property data.';
          dataNote.classList.add('is-ready');
          rebuildElements();
          renderAll();
        }
      } catch (error) {
        dataNote.textContent = 'Property cache unavailable. Using built-in lesson data.';
      }

      try {
        const response = await fetch(PROPERTY_SOURCE_URL, { cache: 'force-cache' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const json = await response.json();
        propertyRefBySymbol = simplifyRemoteData(json);
        try { localStorage.setItem(PROPERTY_CACHE_KEY, JSON.stringify(propertyRefBySymbol)); } catch (error) {}
        dataNote.textContent = 'Lab property data loaded: temperature, density, and electronegativity are live.';
        dataNote.classList.add('is-ready');
      } catch (error) {
        if (!Object.keys(propertyRefBySymbol).length) {
          dataNote.textContent = 'Could not load extended chemistry data. Core lesson mode is still available.';
          dataNote.classList.remove('is-ready');
        }
      }

      rebuildElements();
      renderAll();
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

    function getEarthProfile(symbol, cat) {
      const fallback = CATEGORY_EARTH[cat] || CATEGORY_EARTH.tm;
      const specific = ELEMENT_EARTH[symbol] || {};
      const sources = specific.sources || fallback.sources || [];
      const forms = specific.forms || fallback.forms || [];
      return {
        sources,
        forms,
        extraction: specific.extraction || fallback.extraction,
        occurrence: specific.occurrence || fallback.occurrence,
        mediaPrompt: specific.mediaPrompt || fallback.mediaPrompt,
        imageStatus: specific.image ? "ready" : "needed",
        image: specific.image || null,
        imageCredit: specific.imageCredit || "Image sourcing required in the licensed media phase",
        imageLicense: specific.imageLicense || "Pending"
      };
    }

    function rebuildElements() {
      elements = BASE_ELEMENTS.map((base) => {
        const ref = propertyRefBySymbol[base.symbol] || {};
        return Object.assign({}, base, {
          melt: normalizeValue(ref.melt),
          boil: normalizeValue(ref.boil),
          density: normalizeValue(ref.density),
          electronegativity: normalizeValue(ref.electronegativity),
          electronConfig: ref.electronConfig || base.shells.map((count, index) => 'n' + (index + 1) + ':' + count).join(' · '),
          phase: ref.phase || null,
          appearance: ref.appearance || '',
          summary: ref.summary || base.description,
          applications: getApplications(base.symbol, base.cat),
          crystal: getCrystalProfile(base.symbol, base.cat),
          earth: getEarthProfile(base.symbol, base.cat),
          rarity: estimateRarity(base, ref)
        });
      });
    }

    function getState(element, temperature) {
      if (Number.isFinite(element.melt) && temperature < element.melt) return 'solid';
      if (Number.isFinite(element.boil) && temperature < element.boil && (!Number.isFinite(element.melt) || temperature >= element.melt)) return 'liquid';
      if (Number.isFinite(element.boil) && temperature >= element.boil) return 'gas';
      return element.phase || 'unknown';
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
      if (activeHeatmap === 'density') return element.density;
      if (activeHeatmap === 'electronegativity') return element.electronegativity;
      if (activeHeatmap === 'rarity') return element.rarity;
      return null;
    }

    function getHeatmapIntensity(element) {
      if (activeHeatmap === 'none') return 0;
      const values = elements.map(getHeatmapValue).filter((value) => Number.isFinite(value));
      if (!values.length) return 0;
      const max = Math.max.apply(null, values);
      const value = getHeatmapValue(element);
      if (!Number.isFinite(value) || max <= 0) return 0;
      return Math.pow(value / max, 0.72);
    }

    function getCellBackground(element, state) {
      const base = CATS[element.cat].color;
      const intensity = getHeatmapIntensity(element);
      const heatOverlay = intensity > 0 ? HEATMAPS[activeHeatmap].tint.replace('VAR', (0.18 + intensity * 0.6).toFixed(3)) : null;
      const layers = [];
      if (heatOverlay) layers.push(heatOverlay);
      if (state === 'liquid') {
        layers.push('linear-gradient(180deg, rgba(255,255,255,0.86), rgba(59,130,246,0.22))');
        layers.push('linear-gradient(135deg, rgba(56,189,248,0.34), rgba(14,165,233,0.18))');
      } else if (state === 'gas') {
        layers.push('radial-gradient(circle at 50% 35%, rgba(255,255,255,0.9), rgba(255,255,255,0.12) 55%, rgba(255,255,255,0.02) 100%)');
        layers.push('linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.05))');
      } else if (state === 'unknown') {
        layers.push('linear-gradient(180deg, rgba(255,255,255,0.76), ' + rgba(base, 0.14) + ')');
      } else {
        layers.push('linear-gradient(180deg, rgba(255,255,255,0.88), ' + rgba(base, 0.18) + ')');
        layers.push('linear-gradient(135deg, ' + rgba(base, 0.1) + ', rgba(255,255,255,0.2))');
      }
      return layers.join(', ');
    }

    function matchesFilters(element) {
      const matchesCat = activeCat === 'all' || element.cat === activeCat;
      const matchesSearch = !searchQ || element.symbol.toLowerCase().includes(searchQ) || element.name.toLowerCase().includes(searchQ) || String(element.number).startsWith(searchQ);
      return matchesCat && matchesSearch && (!patternFilter || patternFilter(element));
    }

    function renderCategoryControls() {
      ctrl.innerHTML = '';
      const defs = [['all', { label: 'All 118', color: '#555' }]].concat(Object.entries(CATS));
      defs.forEach(([key, meta]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pt-filter-btn';
        btn.dataset.cat = key;
        btn.textContent = meta.label;
        btn.style.color = meta.color;
        btn.style.borderColor = key === 'all' ? '#bbb' : meta.color;
        const active = activeCat === key;
        btn.classList.toggle('pt-btn-active', active && key !== 'all');
        btn.classList.toggle('pt-btn-dimmed', activeCat !== 'all' && !active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (active && key !== 'all') {
          btn.style.background = meta.color;
          btn.style.color = '#fff';
        }
        btn.addEventListener('mouseenter', () => { if (key !== 'all') { isolatedCat = key; renderGrid(); } });
        btn.addEventListener('mouseleave', () => { if (isolatedCat === key) { isolatedCat = null; renderGrid(); } });
        btn.addEventListener('click', () => { activeCat = key; renderAll(); });
        ctrl.appendChild(btn);
      });
    }

    function renderLegend() {
      legend.innerHTML = '';
      Object.entries(CATS).forEach(([key, meta]) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'pt-legend-item';
        item.innerHTML = '<span class="pt-legend-dot" style="background:' + meta.color + '25;border:1.5px solid ' + meta.color + ';"></span>' + meta.label;
        item.addEventListener('mouseenter', () => { isolatedCat = key; renderGrid(); });
        item.addEventListener('mouseleave', () => { isolatedCat = null; renderGrid(); });
        item.addEventListener('click', () => { activeCat = key; renderAll(); });
        legend.appendChild(item);
      });
    }

    function renderHeatmapControls() {
      heatmapWrap.innerHTML = '';
      Object.entries(HEATMAPS).forEach(([key, meta]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pt-heat-btn';
        btn.textContent = meta.label;
        btn.classList.toggle('is-active', activeHeatmap === key);
        btn.addEventListener('click', () => { activeHeatmap = key; renderAll(); });
        heatmapWrap.appendChild(btn);
      });
    }

    function renderGrid() {
      grid.innerHTML = '';
      const frow = document.createElement('div');
      frow.className = 'pt-frow';
      frow.setAttribute('aria-hidden', 'true');
      frow.innerHTML = '<div class="pt-frow-line"></div><span class="pt-frow-label">f-block</span><div class="pt-frow-line"></div>';
      grid.appendChild(frow);
      [[3, 6, '57–71'], [3, 7, '89–103']].forEach(([col, row, label]) => {
        const ph = document.createElement('div');
        ph.className = 'pt-ph';
        ph.style.gridColumn = col;
        ph.style.gridRow = row;
        ph.textContent = label;
        ph.setAttribute('aria-hidden', 'true');
        grid.appendChild(ph);
      });
      elements.forEach((element) => {
        const color = CATS[element.cat].color;
        const state = getState(element, currentTemp);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'el';
        cell.dataset.z = String(element.number);
        cell.dataset.cat = element.cat;
        cell.style.gridColumn = element.col;
        cell.style.gridRow = element.row;
        cell.style.background = getCellBackground(element, state);
        cell.style.color = state === 'gas' ? '#446072' : color;
        cell.style.borderColor = state === 'liquid' ? 'rgba(59,130,246,0.32)' : rgba(color, 0.34);
        cell.classList.toggle('el-selected', selectedSymbol === element.symbol);
        cell.classList.toggle('el-dimmed', !matchesFilters(element));
        cell.classList.toggle('el-isolated-out', !!isolatedCat && element.cat !== isolatedCat);
        cell.classList.toggle('el-command-match', commandMatches.has(element.symbol));
        cell.setAttribute('aria-label', element.name + ', element ' + element.number + ', ' + getStateLabel(state) + ' at ' + currentTemp + ' Kelvin');
        cell.innerHTML = '<span class="el-num">' + element.number + '</span>' + '<span class="el-sym">' + element.symbol + '</span>' + '<span class="el-name">' + element.name + '</span>' + '<span class="el-phase">' + getStateLabel(state) + '</span>' + '<span class="el-mass">' + element.mass + '</span>';
        cell.title = element.name;
        cell.addEventListener('click', () => {
          showElement(element, false);
          const fresh = grid.querySelector('.el[data-z="' + element.number + '"]');
          if (fresh) fresh.focus({ preventScroll: true });
        });
        grid.appendChild(cell);
      });
    }

    function buildBohr(shells, color, electronegativity) {
      const cx = 140;
      const cy = 140;
      const rSteps = [34, 58, 82, 102, 120, 136, 150];
      const orbitBias = Number.isFinite(electronegativity) ? Math.max(0.55, 1.32 - electronegativity * 0.14) : 1;
      let svg = '<g transform="translate(' + cx + ',' + cy + ')">';
      shells.forEach((count, index) => {
        const r = rSteps[index] ?? rSteps[rSteps.length - 1] + (index - 6) * 13;
        svg += '<circle class="orbit-ring" cx="0" cy="0" r="' + r + '"/>';
        if (count <= 0) return;
        const duration = (4.2 + index * 2.4) * orbitBias;
        const direction = index % 2 === 0 ? 'orb-cw' : 'orb-ccw';
        const step = (2 * Math.PI) / count;
        let dots = '';
        for (let i = 0; i < count; i++) {
          const angle = step * i;
          dots += '<circle cx="' + (r * Math.cos(angle)).toFixed(1) + '" cy="' + (r * Math.sin(angle)).toFixed(1) + '" r="4.2" fill="' + color + '" opacity="0.88"/>';
        }
        svg += '<g style="transform-origin:0 0;animation:' + direction + ' ' + duration.toFixed(2) + 's linear infinite">' + dots + '</g>';
      });
      const total = shells.reduce((sum, count) => sum + count, 0);
      svg += '<circle cx="0" cy="0" r="' + Math.min(27, 9 + shells.length * 2.2) + '" fill="' + color + '" opacity="0.9"/>';
      svg += '<text x="0" y="0" style="font-size:' + (total > 99 ? 9 : total > 9 ? 11 : 14) + 'px;font-weight:800;fill:#fff;text-anchor:middle;dominant-baseline:central;">' + total + '</text>';
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
      let svg = '<defs>';
      svg += '<radialGradient id="qm-core" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="' + color + '" stop-opacity="0.95"/><stop offset="62%" stop-color="' + color + '" stop-opacity="0.28"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></radialGradient>';
      svg += '<radialGradient id="qm-lobe" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white" stop-opacity="0.72"/><stop offset="34%" stop-color="' + color + '" stop-opacity="0.52"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></radialGradient>';
      svg += '</defs>';
      svg += '<rect x="6" y="6" width="268" height="268" rx="36" fill="' + rgba(color, 0.045) + '" stroke="' + rgba(color, 0.14) + '"/>';
      element.shells.forEach((count, index) => {
        const radius = 28 + index * 17;
        const alpha = Math.min(0.42, 0.08 + count / 80);
        svg += '<circle class="qm-cloud" cx="140" cy="140" r="' + radius + '" fill="none" stroke="' + rgba(color, alpha) + '" stroke-width="' + Math.max(6, 13 - index) + '"/>';
      });
      if (block === 's') {
        svg += '<circle class="qm-cloud" cx="140" cy="140" r="' + (52 + shellCount * 12) + '" fill="url(#qm-core)" opacity="' + opacity.toFixed(2) + '"/>';
      } else if (block === 'p') {
        [[0, -42, 34, lobeSize], [0, 42, 34, lobeSize], [-42, 0, lobeSize, 34], [42, 0, lobeSize, 34]].forEach(([dx, dy, rx, ry]) => {
          svg += '<ellipse class="qm-cloud" cx="' + (140 + dx) + '" cy="' + (140 + dy) + '" rx="' + rx + '" ry="' + ry + '" fill="url(#qm-lobe)" stroke="' + rgba(color, 0.26) + '" stroke-width="1.5" opacity="0.62"/>';
        });
      } else if (block === 'd') {
        [45, 135, 225, 315].forEach((angle) => {
          const rad = angle * Math.PI / 180;
          svg += '<ellipse class="qm-cloud" cx="' + (140 + Math.cos(rad) * 42).toFixed(1) + '" cy="' + (140 + Math.sin(rad) * 42).toFixed(1) + '" rx="31" ry="' + lobeSize + '" fill="url(#qm-lobe)" stroke="' + rgba(color, 0.24) + '" stroke-width="1.4" opacity="0.55" transform="rotate(' + angle + ',140,140)"/>';
        });
      } else {
        [0, 30, 60, 90, 120, 150].forEach((angle, index) => {
          svg += '<ellipse class="qm-cloud" cx="140" cy="140" rx="' + (36 + index * 2) + '" ry="' + (82 + shellCount * 5) + '" fill="url(#qm-lobe)" stroke="' + rgba(color, 0.2) + '" stroke-width="1.2" opacity="0.34" transform="rotate(' + angle + ',140,140)"/>';
        });
      }
      svg += '<circle cx="140" cy="140" r="18" fill="' + color + '" opacity="0.92"/>';
      svg += '<text x="140" y="140" font-size="' + (total > 99 ? 9 : 12) + '" font-weight="900" fill="white" text-anchor="middle" dominant-baseline="central">' + element.symbol + '</text>';
      svg += '<text x="140" y="256" font-size="10" font-weight="800" fill="#64748b" text-anchor="middle">' + block.toUpperCase() + '-block probability cloud - ' + total + ' electrons</text>';
      return svg;
    }

    function renderAtomExplain(element) {
      const host = document.getElementById('ep-atom-explain');
      const quantum = atomModel === 'quantum';
      host.innerHTML = '<summary>A teaching model, not a picture of a real atom</summary>'
        + '<h4>What you are viewing</h4><ul>'
        + '<li>' + (quantum
          ? 'Fuzzy <strong>probability clouds</strong> arranged by shell and by block (s, p, d, f). A cloud shows where an electron is <em>likely</em> to be found, not where it is.'
          : 'A <strong>nucleus</strong> (' + element.number + ' protons) and rings showing how many electrons sit in each energy shell: ' + element.shells.join(' \u00B7 ') + '.') + '</li>'
        + '<li>The electron counts per shell are real data for the ground state. Everything else about the drawing is a convenient picture.</li></ul>'
        + '<h4>What is simplified</h4><ul>'
        + (quantum
          ? '<li>Shapes and spread are schematic. Real orbitals come from solving the Schr\u00F6dinger equation, have distinct lobes and nodes, and have no hard edge.</li>'
          : '<li>Electrons do <strong>not</strong> orbit on circular tracks like planets. Niels Bohr\u2019s 1913 picture works well for hydrogen only and fails for multi-electron atoms.</li>')
        + '<li>Not to scale: the nucleus is about 100,000 times smaller than the atom. If the atom were a stadium, the nucleus would be a pea.</li>'
        + '<li>Electrons are not dots: they behave as waves and particles, and they cannot be pinned to an exact position and speed at once.</li></ul>'
        + '<h4>Why it matters</h4><p>The shell count tells you the <strong>period</strong>, and the electrons in the outermost shell (the valence electrons) set the <strong>group</strong>, bonding and reactivity. That is why ' + element.name + ' behaves like its column neighbours. Chemists use these models as bookkeeping to predict bonds and reactions, then switch to quantum models when precision matters.</p>';
    }

    function renderAtomModel(element, color) {
      const title = document.getElementById('ep-model-title');
      const note = document.getElementById('ep-shell-note');
      atomModelButtons.forEach((button) => button.setAttribute('aria-pressed', button.dataset.atomModel === atomModel ? 'true' : 'false'));
      renderAtomExplain(element);
      if (atomModel === 'quantum') {
        title.textContent = 'Quantum Cloud Model';
        document.getElementById('bohr-svg').innerHTML = buildQuantumModel(element, color);
        note.textContent = 'Simplified quantum mode: electron clouds show probability regions by shell count and periodic-table block, not fixed circular paths.';
        return;
      }
      title.textContent = 'Electron Shell Model';
      document.getElementById('bohr-svg').innerHTML = buildBohr(element.shells, color, element.electronegativity);
      note.textContent = 'Simplified Bohr model: rings organize electrons by energy level for classroom comparison, not literal electron paths.';
    }

    let crystalViewer = null;
    function renderCrystal(element, color) {
      if (!window.CrystalViewer) return;
      if (!crystalViewer) crystalViewer = window.CrystalViewer.mount(document.getElementById('crystal-host'));
      crystalViewer.setElement({ symbol: element.symbol, name: element.name, number: element.number, color: color, mass: Number(element.mass), density: element.density, melt: element.melt, temp: currentTemp });
    }

    function formatValue(value, suffix, digits) {
      if (!Number.isFinite(value)) return 'Unknown';
      const precision = typeof digits === 'number' ? digits : value >= 100 ? 0 : 2;
      return Number(value).toFixed(precision) + (suffix || '');
    }

    function formatStateText(element) {
      const state = getState(element, currentTemp);
      if (state === 'solid') return 'Solid below ' + formatValue(element.melt, ' K', 0);
      if (state === 'liquid') return Number.isFinite(element.boil) ? 'Liquid until ' + formatValue(element.boil, ' K', 0) : 'Liquid in this temperature band';
      if (state === 'gas') return Number.isFinite(element.boil) ? 'Gas above ' + formatValue(element.boil, ' K', 0) : 'Gas under standard conditions';
      return 'Predicted state';
    }

    function renderStats(element) {
      const state = getState(element, currentTemp);
      const stats = [
        { label: 'Current state', value: getStateLabel(state), sub: currentTemp + ' K · ' + formatStateText(element) },
        { label: 'Melting point', value: formatValue(element.melt, ' K', 0), sub: 'Where the solid begins to loosen.' },
        { label: 'Boiling point', value: formatValue(element.boil, ' K', 0), sub: 'Where particles escape into gas.' },
        { label: 'Electronegativity', value: formatValue(element.electronegativity, '', 2), sub: 'Higher values pull shared electrons harder.' },
        { label: 'Density', value: formatValue(element.density, ' g/cm³', 2), sub: 'Mass packed into a given volume.' },
        { label: 'Rarity lens', value: Math.round(element.rarity * 100) + ' / 100', sub: 'Higher scores mean rarer or harder-to-find materials.' },
        { label: 'Electron shells', value: element.shells.join(' · '), sub: element.electronConfig || 'Shell population model' },
        { label: 'Appearance', value: element.appearance ? element.appearance.split(',')[0] : 'Reference lesson note', sub: 'Observed under ordinary lab conditions.' }
      ];
      document.getElementById('ep-stats').innerHTML = stats.map((stat) => '<div class="ep-stat"><span class="ep-stat-label">' + stat.label + '</span><span class="ep-stat-value">' + stat.value + '</span><span class="ep-stat-sub">' + stat.sub + '</span></div>').join('');
    }

    function renderUsage(element) {
      document.getElementById('ep-usage').innerHTML = element.applications.map((item) => '<article class="ep-usage-item"><span class="ep-usage-icon">' + item.icon + '</span><span class="ep-usage-title">' + item.title + '</span><span class="ep-usage-copy">' + item.copy + '</span></article>').join('');
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
      host.innerHTML = '<strong>\u2622 Radioactive decay</strong><br>'
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
      const color = CATS[element.cat].color;
      let grid = '';
      for (let lo = -150; lo <= 180; lo += 30) { const gx = (lo + 180) / 360 * 720; grid += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="360"/>'; }
      for (let la = -60; la <= 60; la += 30) { const gy = (90 - la) / 180 * 360; grid += '<line x1="0" y1="' + gy + '" x2="720" y2="' + gy + '"' + (la === 0 ? ' class="ep-map-eq"' : '') + '/>'; }
      const flip = Number(x) > 480;
      const label = '<text class="ep-map-label" x="' + (flip ? Number(x) - 12 : Number(x) + 12) + '" y="' + (Number(y) + 4) + '" text-anchor="' + (flip ? 'end' : 'start') + '">' + element.symbol + ' · ' + year + '</text>';
      const svg = '<svg class="ep-map" viewBox="0 0 720 360" role="img" aria-label="World map with a marker at ' + place + '">'
        + '<g class="ep-map-grid">' + grid + '</g><path class="ep-map-land" d="' + window.WORLD_LAND_PATH + '"/>'
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
      const earth = element.earth || getEarthProfile(element.symbol, element.cat);
      const activeSources = new Set(earth.sources || []);
      const sourceHtml = Object.entries(SOURCE_DEFS).map(([key, meta]) => {
        const active = activeSources.has(key);
        return `<span class=\"ep-source-pill${active ? " is-active" : ""}\"><span class=\"ep-source-icon\">${SOURCE_ICONS[meta.icon]}</span>${meta.label}</span>`;
      }).join("");
      const flow = [
        ["Earth source", earth.occurrence],
        ["Common forms", (earth.forms || []).join("; ")],
        ["Production", earth.extraction],
        ["Media target", earth.mediaPrompt]
      ].map(([label, value]) => `<div class=\"ep-flow-step\"><span class=\"ep-flow-label\">${label}</span><span class=\"ep-flow-value\">${value}</span></div>`).join("");
      const hasGallery = ((window.ELEMENT_IMAGES || {})[element.symbol] || []).length > 0;
      const mediaNote = hasGallery ? "See the photos above." : earth.imageStatus === "ready"
        ? `Image ready: ${earth.imageCredit} (${earth.imageLicense}).`
        : `Image required: source a real-life, licensed photo for this element form. ${earth.imageCredit}.`;
      document.getElementById("ep-earth").innerHTML = `<h3 class=\"ep-earth-title\">Where it is found on Earth</h3><div class=\"ep-source-grid\">${sourceHtml}</div><div class=\"ep-flow\">${flow}</div><div class=\"ep-media-note\">${mediaNote}</div>`;
    }

    function renderSupply(element) {
      const d = (window.ELEMENT_SUPPLY || {})[element.symbol] || {};
      const U = 'Unknown';
      const num = (v, suffix) => (v === undefined || v === null || v === '') ? U : (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 7 }) : String(v)) + (suffix || '');
      const list = (a) => Array.isArray(a) && a.length ? a.join(', ') : U;
      const rows = [
        ['Relative supply risk', num(d.supplyRisk)],
        ['Crustal abundance (ppm)', num(d.crust)],
        ['Recycling rate (%)', num(d.recycling)],
        ['Substitutability', num(d.substitutability)],
        ['Production concentration (%)', num(d.prodConcentration)],
        ['Reserve distribution (%)', num(d.reserveDistribution)],
        ['Top 3 producers', list(d.producers)],
        ['Top 3 reserve holders', list(d.reserveHolders)],
        ['Political stability of top producer', num(d.stabilityProducer)],
        ['Political stability of top reserve holder', num(d.stabilityReserve)]
      ];
      document.getElementById('ep-supply').innerHTML = '<h3 class="ep-earth-title">Supply and sustainability</h3><div class="ep-flow">'
        + rows.map(([k, v]) => '<div class="ep-flow-step"><span class="ep-flow-label">' + k + '</span><span class="ep-flow-value">' + v + '</span></div>').join('') + '</div>' + (d.history ? '<div class="ep-media-note"><strong>Through history:</strong> ' + d.history + '</div>' : '') + '<div class="ep-media-note">' + (window.ELEMENT_SUPPLY_ASOF || '') + '</div>';
    }

    function renderGallery(element) {
      const host = document.getElementById('ep-gallery');
      const items = (window.ELEMENT_IMAGES || {})[element.symbol] || [];
      if (!items.length) { host.hidden = true; host.innerHTML = ''; return; }
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

    /* ── Pattern finder ───────────────────────────────── */
    const finderTabs = document.getElementById('pt-finder-tabs');
    const finderItems = document.getElementById('pt-finder-items');
    const finderOut = document.getElementById('pt-finder-out');
    const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118];
    const ordinal = (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
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
    let finderLens = null;
    let finderItem = null;

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
            how: 'Read the column number (1–18). Main-group shortcut: groups 1–2 have that many valence electrons; groups 13–18 have (group − 10). Older tables label these IA–VIIIA.' };
        });
      }
      if (lens === 'block') {
        const B = { s: ['s-block', 'Groups 1–2 plus helium. The last electron enters an s subshell. Two columns wide, because an s subshell holds 2 electrons.'],
          p: ['p-block', 'Groups 13–18. The last electron enters a p subshell (6 electrons, so six columns). Contains nearly every nonmetal, all the metalloids and the halogens and noble gases.'],
          d: ['d-block', 'Groups 3–12, the transition metals. A d subshell holds 10 electrons, so the block is ten columns wide.'],
          f: ['f-block', 'Lanthanides and actinides. An f subshell holds 14 electrons, so each row has 14 (15 counting La/Ac or Lu/Lr, which sit in group 3 on some tables). Drawn detached to keep the table narrow.'] };
        return ['s', 'p', 'd', 'f'].map((b) => ({ key: b, label: B[b][0], test: (e) => blockOf(e) === b, title: B[b][0], body: B[b][1],
          how: 'Block letters name the subshell being filled. Widths 2, 6, 10 and 14 are the subshell capacities, which sets the shape of the whole table.' }));
      }
      if (lens === 'family') {
        return Object.entries(FAMILIES).map(([key, f]) => ({ key, label: f.label.split(' (')[0], test: f.test, title: f.label, body: f.body, how: f.how }));
      }
      return Object.entries(TRENDS).map(([key, t]) => ({ key, label: t.label, test: (e) => t.symbols.indexOf(e.symbol) >= 0, title: t.label, body: t.body, how: t.how }));
    }

    function renderFinder() {
      const lenses = [['period', 'Periods (rows)'], ['group', 'Groups (columns)'], ['block', 'Blocks'], ['family', 'Families'], ['trend', 'Trends']];
      finderTabs.innerHTML = '';
      lenses.forEach(([key, label]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pt-finder-btn'; b.textContent = label;
        b.setAttribute('aria-pressed', finderLens === key ? 'true' : 'false');
        b.addEventListener('click', () => { finderLens = finderLens === key ? null : key; finderItem = null; applyFinder(); });
        finderTabs.appendChild(b);
      });
      finderItems.innerHTML = '';
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
        finderOut.innerHTML = '<p>' + (finderLens ? 'Choose an item above.' : 'Start with a lens above. <strong>Periods</strong> are rows (same number of shells), <strong>groups</strong> are columns (same outer electrons), <strong>blocks</strong> are the subshell being filled, <strong>families</strong> are named regions of similar behaviour, and <strong>trends</strong> are gradual changes in size, reactivity and electron-grabbing power across and down the table.') + '</p>';
      }
    }
    function applyFinder() { renderFinder(); renderGrid(); }

    function showElement(element, shouldScroll) {
      selectedSymbol = element.symbol;
      const state = getState(element, currentTemp);
      const color = CATS[element.cat].color;
      renderAtomModel(element, color);
      renderCrystal(element, color);
      document.getElementById('ep-crystal-tag').textContent = element.crystal.label;
      document.getElementById('ep-sym').textContent = element.symbol;
      document.getElementById('ep-sym').style.color = color;
      document.getElementById('ep-name').textContent = element.name;
      document.getElementById('ep-num').textContent = element.number;
      document.getElementById('ep-mass').textContent = element.mass;
      document.getElementById('ep-badge').textContent = CATS[element.cat].label;
      document.getElementById('ep-badge').style.background = color;
      readableInk(document.getElementById('ep-badge'), color);
      document.getElementById('ep-state').textContent = getStateLabel(state) + ' at ' + currentTemp + ' K';
      document.getElementById('ep-config').textContent = element.electronConfig || element.shells.map((count, index) => 'Shell ' + (index + 1) + ': ' + count + 'e⁻').join(' · ');
      document.getElementById('ep-desc').textContent = element.summary || element.description;
      renderStats(element);
      renderUsage(element);
      renderStory(element);
      renderDecayLink(element);
      renderHistory(element);
      renderEarthProfile(element);
      renderSupply(element);
      renderGallery(element);
      detailPanel.classList.remove('ep-open');
      void detailPanel.offsetWidth;
      detailPanel.classList.add('ep-open');
      renderGrid();
      if (shouldScroll) detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function closePanel() {
      selectedSymbol = null;
      detailPanel.classList.remove('ep-open');
      renderGrid();
    }

    function renderTemperatureReadout() {
      tempReadout.textContent = currentTemp + ' K';
      tempStateReadout.textContent = getStateSubtitle();
    }

    function renderCommandList(filter) {
      const needle = String(filter || '').trim().toLowerCase();
      const items = COMMANDS.filter((command) => !needle || command.label.includes(needle) || command.note.toLowerCase().includes(needle));
      if (!items.length) {
        commandList.innerHTML = '<div class="pt-command-empty">No command found yet. Try batteries, balloons, chips, or fireworks.</div>';
        return;
      }
      commandList.innerHTML = items.map((command) => '<button class="pt-command-item" type="button" data-command="' + command.label + '"><strong>' + command.label + '</strong><small>' + command.note + '</small></button>').join('');
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

    function applyCommand(label) {
      const command = COMMANDS.find((entry) => entry.label === label);
      if (!command) return;
      commandMatches = new Set(command.symbols);
      commandStatus.textContent = 'Command "' + command.label + '" highlighting ' + command.symbols.join(', ') + '.';
      const lead = elements.find((entry) => commandMatches.has(entry.symbol));
      closeCommandPalette();
      renderGrid();
      if (lead) showElement(lead, true);
    }

    function clearCommandHighlight() {
      commandMatches = new Set();
      commandStatus.textContent = 'Try “batteries”, “balloons”, or “chips”.';
      renderGrid();
    }

    /* ── Inspector tabs + default selection (wide-screen dashboard) ── */
    const dashQuery = window.matchMedia('(min-width: 1180px)');
    (function buildInspectorTabs() {
      const tabs = [['stats', 'Stats'], ['crystal', 'Crystal'], ['atom', 'Atom'], ['uses', 'Uses'], ['earth', 'Earth & supply'], ['history', 'History'], ['photos', 'Photos']];
      const bar = document.createElement('div');
      bar.className = 'ep-tabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Element detail sections');
      tabs.forEach(([key, label]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'ep-tab-btn'; b.textContent = label; b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', key === 'stats' ? 'true' : 'false');
        b.addEventListener('click', () => {
          detailPanel.dataset.tabActive = key;
          bar.querySelectorAll('.ep-tab-btn').forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
        });
        bar.appendChild(b);
      });
      detailPanel.insertBefore(bar, detailPanel.firstChild);
    })();
    function ensureDefaultSelection() {
      if (dashQuery.matches && !selectedSymbol && elements.length) showElement(elements.find((e) => e.symbol === 'Fe') || elements[0], false);
    }
    dashQuery.addEventListener('change', ensureDefaultSelection);

    function renderAll() {
      renderCategoryControls();
      renderLegend();
      renderHeatmapControls();
      renderTemperatureReadout();
      renderFinder();
      renderGrid();
      if (selectedSymbol) {
        const element = elements.find((entry) => entry.symbol === selectedSymbol);
        if (element) showElement(element, false);
      }
      ensureDefaultSelection();
    }

    searchInput.addEventListener('input', (event) => {
      searchQ = event.target.value.toLowerCase().trim();
      if (!searchQ) clearCommandHighlight();
      renderGrid();
    });

    tempInput.addEventListener('input', (event) => {
      currentTemp = Number(event.target.value);
      renderTemperatureReadout();
      renderGrid();
      if (selectedSymbol) {
        const element = elements.find((entry) => entry.symbol === selectedSymbol);
        if (element) showElement(element, false);
      }
    });

    atomModelButtons.forEach((button) => {
      button.addEventListener('click', () => {
        atomModel = button.dataset.atomModel || 'bohr';
        if (selectedSymbol) {
          const element = elements.find((entry) => entry.symbol === selectedSymbol);
          if (element) renderAtomModel(element, CATS[element.cat].color);
        } else {
          atomModelButtons.forEach((entry) => entry.setAttribute('aria-pressed', entry === button ? 'true' : 'false'));
        }
      });
    });

    document.getElementById('ep-close').addEventListener('click', closePanel);
    commandOpen.addEventListener('click', openCommandPalette);
    commandClose.addEventListener('click', closeCommandPalette);
    commandBackdrop.addEventListener('click', closeCommandPalette);
    commandInput.addEventListener('input', (event) => renderCommandList(event.target.value));
    commandInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const first = commandList.querySelector('[data-command]');
        if (first) applyCommand(first.dataset.command);
      }
    });
    commandList.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-command]');
      if (btn) applyCommand(btn.dataset.command);
    });

    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openCommandPalette();
        return;
      }
      if (event.key === 'Escape') {
        if (commandRoot.classList.contains('is-open')) closeCommandPalette();
        else if (selectedSymbol) closePanel();
      }
    });

    rebuildElements();
    renderAll();
    loadReferenceData();
  })();
  
