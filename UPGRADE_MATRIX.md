# Lesson Upgrade Matrix

Priority tiers: **P1** (high payoff, moderate effort) → **P2** (medium payoff) → **P3** (low payoff or concept-driven)

Difficulty: **Easy** (drop-in API call or embed) · **Medium** (data pipeline + rendering change) · **Hard** (significant simulation rewrite)

---

## Space & Astronomy

| Lesson | Target Source | What to Import | Difficulty | Accuracy Payoff |
|--------|--------------|----------------|------------|-----------------|
| `planetary-system.html` | JPL Horizons API | Real Keplerian orbital elements (a, e, i, Ω, ω, M) for all 8 planets + major moons; update every render tick via ephemeris | Medium | **High** — current hand-coded orbits drift, real elements give correct inclinations and eccentricities |
| `heliocentrism.html` | JPL Horizons API | Same orbital elements; focus on inner solar system and historical planet positions to match Copernicus/Kepler context | Medium | **High** — historical date scrubbing would let students see actual sky positions Galileo saw |
| `universal-gravitation.html` | NASA Fact Sheets (static JSON) | Real planetary masses, radii, and mean orbital distances; use as constants in existing force equations | Easy | **Medium** — replaces round-number placeholders with SI values |
| `universe-expansion.html` | Planck 2018 dataset (static) | H₀ = 67.4 km/s/Mpc, Ω_m = 0.315, Ω_Λ = 0.685; CMB timeline markers | Easy | **High** — cosmological constants are currently approximate; Planck values are classroom-standard |
| `mars-rover-lander.html` | NASA Mars Trek API + PDS | Elevation tiles from MOLA (Mars Orbiter Laser Altimeter); actual landing site coordinates for Curiosity/Perseverance | Hard | **High** — real terrain replaces flat procedural surface; lander physics becomes testable against real slopes |
| `event-horizon-telescope.html` | EHT public data release (static assets) | Published M87* and Sgr A* image reconstructions; real baseline map of EHT array stations | Easy | **Medium** — swap placeholder ring image for actual EHT release; add real array footprint overlay |
| `seti-search.html` | Breakthrough Listen Open Data + WTF star (Boyajian's) | Real candidate signal CSV from Breakthrough Listen archive; actual frequency waterfall samples | Medium | **Medium** — gives students real data to analyze rather than synthetic signals |
| `pale-blue-dot.html` | JPL SPICE (Horizons) | Voyager 1 trajectory data; exact date/distance when image was taken (Feb 14 1990, 6.06 billion km) | Easy | **Medium** — current distance display is approximate; real SPICE ephemeris nails the geometry |
| `arecibo-message.html` | NAIC archives (static) | Original 1679-bit binary string; factored grid dimensions (23 × 73); actual transmission frequency 2380 MHz | Easy | **Medium** — ensure the encoded message matches the exact 1974 transmission, not a reconstruction |

---

## Earth Science & Geology

| Lesson | Target Source | What to Import | Difficulty | Accuracy Payoff |
|--------|--------------|----------------|------------|-----------------|
| `pangaea-continental-drift.html` | GPlates Web Service | Plate polygon reconstructions at 10 Ma intervals from 250 Ma to present; use `gplates.earthbyte.org` REST endpoint | **Hard** | **Very High** — current drift is hand-animated; GPlates data is the academic standard for plate reconstruction |
| `volcano-simulator.html` | USGS Volcano Hazards API + GVP | Live volcano alert levels from `volcanoes.usgs.gov/vsc/api`; Smithsonian GVP eruption history for realism | Easy | **High** — lets students see real current activity and compare simulated eruptions to documented ones |
| `climate-simulator.html` | NOAA Mauna Loa CO₂ (monthly CSV) + NASA GISS GISTEMP | Actual CO₂ ppm from 1958–present; global mean temp anomaly series; use as ground-truth slider bounds | Medium | **High** — replaces illustrative curves with measured data; students see real inflection points |
| `earth-circumference.html` | WGS84 reference ellipsoid (static constants) | a = 6,378,137 m, b = 6,356,752 m, f = 1/298.257; add oblate spheroid vs sphere comparison | Easy | **Low** — lesson is historically framed (Eratosthenes), but adding WGS84 numbers as "modern answer" strengthens the payoff |

---

## Chemistry

| Lesson | Target Source | What to Import | Difficulty | Accuracy Payoff |
|--------|--------------|----------------|------------|-----------------|
| `molecular-bonding-lab.html` | PubChem PUG REST + 3Dmol.js | Fetch SDF/XYZ geometry from `pubchem.ncbi.nlm.nih.gov/rest/pug`; render in 3Dmol.js (browser-native, MIT) replacing current hand-built WebGL | Hard | **Very High** — current bond angles and lengths are approximated; PubChem geometries are DFT-optimized |
| `periodic-table.html` | PubChem PUG REST (element endpoint) | Real electronegativity, ionization energy, electron affinity, atomic radius, oxidation states per element | Easy | **High** — enriches existing table with authoritative values; minimal code change |
| `catalyst.html` | PubChem PUG REST (compound endpoint) | Fetch activation energy and reaction enthalpy for common catalytic reactions (e.g. H₂O₂ → H₂O + O₂ via MnO₂) | Medium | **Medium** — grounds the energy-barrier animation in measured thermodynamic data |
| `titration.html` | NIST WebBook (SRD 46 — Critical Stability Constants) | Real pKa values: acetic acid 4.76, carbonic acid 6.35/10.33, ammonia 9.25; real titration curves from NIST | Easy | **High** — current pH curve is hand-drawn; NIST pKa values give correct equivalence point positions |

---

## Classical Physics

| Lesson | Target Source | What to Import | Difficulty | Accuracy Payoff |
|--------|--------------|----------------|------------|-----------------|
| `newtons-laws.html` | PhET "Forces and Motion: Basics" (benchmark) | Validate friction coefficients (μ_s, μ_k), applied force rounding, and net-force display against PhET behavior | Easy | **Medium** — use as a QA target, not an import; ensures your sim matches classroom expectations |
| `pendulum.html` | PhET "Pendulum Lab" (benchmark) + NIST g values | Validate period formula T = 2π√(L/g); add real g values by location (equator 9.780, pole 9.832) | Easy | **Medium** — add location-based g selector; benchmark period accuracy against PhET |
| `coulombs-law.html` | PhET "Coulomb's Law" (benchmark) | Validate force magnitudes at given separations; confirm ε₀ = 8.854 × 10⁻¹² F/m is used throughout | Easy | **Low** — lesson is already strong; just verify constants and edge-case behavior match PhET |
| `faradays-law.html` | PhET "Faraday's Law" (benchmark) | Validate EMF = −dΦ/dt implementation; check that flux visualization matches PhET's field line density | Easy | **Medium** — ensure sign convention and coil-area formula are correct |
| `falling-coil.html` | PhET "Electromagnetic Induction" (benchmark) | Validate induced current direction (Lenz's law), flux change rate, and terminal velocity behavior | Easy | **Medium** — benchmark against PhET to confirm Lenz's law sign and damping are correct |
| `huygens-principle.html` | PhET "Wave Interference" (benchmark) | Validate double-slit fringe spacing: Δy = λL/d; benchmark wavelength-to-fringe relationship | Easy | **Low** — conceptually strong already; validate fringe formula constants |
| `point-wave.html` | PhET "Wave on a String" (benchmark) | Validate wave speed v = fλ, damping models, and boundary condition behavior (fixed vs free end) | Easy | **Low** — use PhET as formula check |
| `dispersive-prism.html` | PhET "Bending Light" (benchmark) + NIST glass indices | Real Cauchy coefficients for borosilicate glass (BK7): B₁ = 1.03961, C₁ = 6.00069 × 10⁻³ μm² | Easy | **Medium** — replace linear n(λ) interpolation with Sellmeier equation for correct dispersion curve shape |
| `archimedes-principle.html` | PhET "Buoyancy" (benchmark) + real density table | Densities (kg/m³): water 997, seawater 1025, ethanol 789, mercury 13,534; benchmark against PhET buoyancy | Easy | **Low** — add density dropdown with real values; validate against PhET |
| `viscosimeter.html` | OSP "Fluid Flow" model + NIST viscosity tables | Dynamic viscosity (mPa·s at 20°C): water 1.002, ethanol 1.074, glycerol 1412, honey ~10,000 | Easy | **Medium** — real viscosity values make Stokes' law drag calibration meaningful |
| `optics.html` | PhET "Geometric Optics" (benchmark) | Validate thin lens equation 1/f = 1/d_o + 1/d_i; benchmark magnification and image position | Easy | **Low** — formula validation only |
| `speed-of-light.html` | CODATA 2018 (static) | c = 299,792,458 m/s (exact, defined); μ₀ = 1.25663706212 × 10⁻⁶ N/A²; ε₀ derived | Easy | **Low** — likely already correct; confirm exact CODATA values are used |

---

## Electronics & Electromagnetism

| Lesson | Target Source | What to Import | Difficulty | Accuracy Payoff |
|--------|--------------|----------------|------------|-----------------|
| `breadboard-basics.html` | CircuitJS1 (open source, MIT) | Port component behavior models (resistor, capacitor, LED I-V curve, transistor Ebers-Moll) into existing canvas; or iframe CircuitJS1 for "go deeper" mode | Hard | **High** — current breadboard is visual-only; CircuitJS1 logic would make current/voltage measurable |
| `faraday-cage.html` | CircuitJS1 + Griffiths EM (static) | Real skin-depth formula δ = √(2ρ/ωμ); CircuitJS1 for showing induced surface currents | Medium | **Medium** — add frequency-dependent shielding effectiveness; benchmark against real copper skin depth |
| `cathode-ray-tube.html` | CircuitJS1 electron gun model | Validate electron deflection: y = (eEL²)/(4mv²); use real CRT operating voltages (1–30 kV) | Medium | **Medium** — real deflection formula with accurate anode voltage makes the trajectory physically correct |
| `van-de-graaff-generator.html` | CircuitJS1 electrostatics | Real breakdown field of air: 3 × 10⁶ V/m; spark discharge voltage for given sphere radius | Easy | **Medium** — add spark-gap breakdown calculation so students predict discharge distance |
| `van-de-graaff-balloon.html` | CircuitJS1 / Coulomb's law (static) | Real charge transfer estimates; triboelectric series ordering for hair/balloon/rubber | Easy | **Low** — mainly conceptual; triboelectric series table is the main factual upgrade |

---

## Concept-Driven Lessons (low external data benefit)

These lessons are already appropriately abstract. The upgrade path is pedagogical (better explanations, richer interactions), not data-driven.

| Lesson | Note |
|--------|------|
| `ai-concepts-foundations.html` | No external data needed — concept taxonomy lesson |
| `ai-eliza.html` | ELIZA script is the artifact; no data upgrade path |
| `turing-test.html` | Philosophical/historical — Turing's 1950 paper is the source |
| `perceptron-lab.html` | Rosenblatt's 1957 algorithm is the content; no external data |
| `minimax-1v1.html` | Algorithm correctness is verifiable by inspection |
| `ngram-predictor.html` | Could add real n-gram corpus (Google Books Ngrams), but that's scope expansion not accuracy |
| `chess-ai-core.html` | Engine correctness benchmarks against Stockfish positions if needed |
| `go-ai.html` | Algorithm-focused; no data import path |
| `a-star-pathfinding.html` | Algorithm lesson; no data needed |
| `sorting-algorithms.html` | Pure CS concept |
| `state-machines.html` | Pure CS concept |
| `expert-system.html` | Knowledge base is hand-authored by design |
| `blocks-world-parser.html` | Classic AI planning — Winograd's SHRDLU is the reference |
| `minimum-spanning-tree.html` | Pure graph algorithm |
| `perlin-noise.html` | Procedural math — Perlin's 1985 algorithm is the source |
| `graphing-calculator.html` | Tool lesson — no data upgrade path |
| `numbers.html` | Mathematical history lesson |
| `pi.html` | Mathematical concept lesson |
| `life-lab.html` | Conway's Game of Life — algorithm is the content |
| `3d-motion.html` | Physics demo — PhET benchmark check is the only upgrade |
| `cad-camera-controls.html` | Tool demonstration |
| `3d-printing.html` | Technology survey lesson |
| `vr-technology.html` | Technology survey lesson |
| `xr-extended-reality.html` | Technology survey lesson |
| `color-theory-lab.html` | Perceptual/artistic — CIE 1931 color space data could be added but is niche |
| `bridge-over-troubled-water.html` | Historical/cultural lesson |
| `tower-babel-library-internet.html` | Historical/philosophical lesson |
| `platos-allegory-cave.html` | Philosophy lesson |
| `productivity-10-80-10.html` | Frameworks/business lesson |
| `ten-eighty-ten.html` | Frameworks/business lesson |
| `stock-exchange.html` | Could use Yahoo Finance or Alpha Vantage for live prices, but adds API key complexity |

---

## Priority Order for Implementation

| Rank | Lesson | Source | Why First |
|------|--------|--------|-----------|
| 1 | `pangaea-continental-drift` | GPlates Web Service | Biggest single accuracy jump; current animation is illustrative not scientific |
| 2 | `molecular-bonding-lab` | PubChem + 3Dmol.js | Replaces guessed geometry with quantum-optimized structures |
| 3 | `climate-simulator` | NOAA Mauna Loa + NASA GISS | Real measured data replaces illustrative curves; high classroom credibility |
| 4 | `planetary-system` | JPL Horizons API | Real orbital elements fix eccentricity and inclination errors across the most-visited lesson |
| 5 | `volcano-simulator` | USGS Volcano Hazards API | Live data feed, easy to add, high engagement value |
| 6 | `periodic-table` | PubChem PUG REST | Easy API call, enriches every element with authoritative values |
| 7 | `titration` | NIST WebBook | Real pKa values are a one-line change with high classroom accuracy payoff |
| 8 | `breadboard-basics` | CircuitJS1 | Hardest but highest payoff for electronics credibility |
| 9 | `dispersive-prism` | NIST Sellmeier coefficients | Sellmeier equation is a small code change with a visibly more accurate dispersion curve |
| 10 | `universe-expansion` | Planck 2018 (static) | Constants update is trivial; students learn the actual measured values |

---

## License Notes

- **JPL Horizons / NASA APIs**: publicly available, no key required for most endpoints; media assets (textures, models) from NASA 3D Resources are "for educational use" — check each asset individually before redistribution
- **GPlates Web Service**: Apache 2.0 for the software; reconstruction data from EarthByte group, CC-BY
- **USGS APIs**: US federal government, public domain
- **NOAA/NASA datasets**: US federal government, public domain
- **PubChem**: NLM/NIH, public domain
- **NIST WebBook**: US federal government, public domain
- **3Dmol.js**: BSD license
- **CircuitJS1**: GPL-2.0 — embedding the full app is fine for open-source use; porting logic to a closed codebase would require caution
- **PhET**: GPL-3.0 — do not copy code; use as benchmark/validation target only
