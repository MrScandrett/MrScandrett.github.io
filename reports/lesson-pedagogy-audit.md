# Lesson Pedagogy Audit (automated baseline)

Generated 2026-10-13 by `npm run audit:pedagogy`. Heuristics only — they decide *what to read first*, not what is wrong. See [targeted validation](lesson-content-review.md) for reviewed examples; this is not a completed expert review.

Extraction: rendered DOM plus source strings. Rendered 398/398 catalog pages; no render failures or missing catalog files.

Limits: keyword counts do not establish teaching quality or factual accuracy. DOM extraction includes hidden content; source strings may include inactive activities. Third-party requests are blocked, and interactions are not exercised.

## Remediation update

The five highest-scoring lessons and Demoscene have been repaired and re-audited in Chromium. All six now score low; neither original misconception is flagged. See [repair validation](lesson-pedagogy-fixes.md). The tables below preserve the original full-catalog baseline; the JSON includes the six refreshed results.

## Original summary

| Tier | Lessons |
|---|---|
| high | 0 |
| medium | 95 |
| low | 303 |

Myth sentences stated as fact: **2** (2 more are already framed as myths/debunked).

| Signal | Lessons | Meaning |
|---|---|---|
| `assertion-without-mechanism` | 239 | States facts but rarely says *why* (few because/therefore/which means) |
| `no-worked-example` | 110 | Quantitative subject with no worked example, walkthrough or derivation |
| `no-quantitative-model` | 50 | Quantitative subject with no equation on the page |
| `short-explanation` | 18 | 250–600 words of readable explanation |
| `no-sources` | 16 | History-heavy content with no sources, references or credits |
| `demo-without-explanation` | 16 | Large interactive sim, little text explaining what it shows or why |
| `unqualified-legend` | 6 | Uses 'legend says / it is said' without evidence |
| `no-check-for-understanding` | 4 | No prediction, quiz, exit ticket or questions |
| `hype-over-substance` | 1 | High density of hype words (amazing, magic, secret…) |
| `thin-explanation` | 1 | Under 250 words of readable explanation |

## Myths stated as fact

| Severity | Rule | Lesson | Sentence | Accurate version |
|---|---|---|---|---|
| medium | `golden-ratio-overclaim` | [Fibonacci Sequence](../lessons/mathematics/advanced-and-calculus/fibonacci-sequence.html) | Nautilus chambers grow by the golden ratio. | Golden-ratio claims about the Parthenon, Mona Lisa, pyramids and nautilus shells are largely unsupported (Markowsky, 1992); nautilus spirals are logarithmic but not golden. |
| low | `heat-rises` | [The Demoscene](../lessons/computer-science/graphics-and-games/demoscene.html) | Heat rises and cools, and flames appear with no drawing at all. | Heat is energy transfer; *warm fluid* rises because it is less dense (convection). Heat also conducts and radiates downward. |

## Lessons by risk

| Tier | Score | Lesson | Module | Words | JS KB | Signals |
|---|---|---|---|---|---|---|
| medium | 7 | [Fibonacci Sequence](../lessons/mathematics/advanced-and-calculus/fibonacci-sequence.html) | Mathematics | 640 | 17 | `assertion-without-mechanism` `no-worked-example` |
| medium | 6 | [Dalton and the Atomic Theory](../lessons/chemistry/dalton-atomic-theory.html) | Chemistry | 455 | 0 | `short-explanation` `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 6 | [Mendeleev and the Periodic Law](../lessons/chemistry/mendeleev-periodic-law.html) | Chemistry | 516 | 0 | `short-explanation` `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 6 | [Vectors](../lessons/physics/mechanics/vectors.html) | Physics | 3449 | 17 | `assertion-without-mechanism` `no-worked-example` `no-check-for-understanding` |
| medium | 6 | [Jim Henson](../lessons/technical-elements/jim-henson.html) | Technical Elements | 1844 | 0 | `assertion-without-mechanism` `no-worked-example` `no-sources` |
| medium | 5 | [Camera Controls in 3D CAD](../lessons/applied-physics-materials/cad-camera-controls.html) | Applied Physics & Materials Science | 1260 | 43 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Electronic Materials Lab](../lessons/applied-physics-materials/electronic-materials-lab.html) | Applied Physics & Materials Science | 740 | 2 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [XR: Extended Reality — OpenXR & WebXR](../lessons/applied-physics-materials/xr-extended-reality.html) | Applied Physics & Materials Science | 2032 | 24 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Character Modeling](../lessons/blender/blender-character-modeling.html) | Applied Physics & Materials Science | 1531 | 17 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Compositing](../lessons/blender/blender-compositing.html) | Applied Physics & Materials Science | 1053 | 12 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Environments & Modular Kits](../lessons/blender/blender-environments.html) | Applied Physics & Materials Science | 1340 | 17 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Geometry Nodes](../lessons/blender/blender-geometry-nodes.html) | Applied Physics & Materials Science | 1289 | 12 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Materials, Lighting & Render](../lessons/blender/blender-materials-render.html) | Applied Physics & Materials Science | 2075 | 17 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [3D Design Studio Pathway](../lessons/blender/blender-pathway.html) | Applied Physics & Materials Science | 1674 | 17 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Props & Hand Tools](../lessons/blender/blender-props-tools.html) | Applied Physics & Materials Science | 1273 | 17 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Sculpting](../lessons/blender/blender-sculpting.html) | Applied Physics & Materials Science | 1501 | 17 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [3D Workflow Workspaces](../lessons/blender/blender-workspaces-pathway.html) | Applied Physics & Materials Science | 657 | 12 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Arecibo Message](../lessons/cosmology/arecibo-message.html) | Cosmology | 977 | 10 | `assertion-without-mechanism` `no-quantitative-model` `no-sources` |
| medium | 5 | [Mars Rover Landing](../lessons/cosmology/mars-rover-lander.html) | Cosmology | 276 | 27 | `short-explanation` `demo-without-explanation` `no-worked-example` |
| medium | 5 | [Pale Blue Dot — Scale of the Universe](../lessons/cosmology/pale-blue-dot.html) | Cosmology | 3722 | 97 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Climate Modeling Simulator](../lessons/earth-science/climate-simulator.html) | Earth Science | 526 | 44 | `short-explanation` `demo-without-explanation` `assertion-without-mechanism` |
| medium | 5 | [The Internet of Things](../lessons/engineering/arduino-and-electronics/internet-of-things.html) | Engineering | 1605 | 6 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Outputs: Beyond the LED](../lessons/engineering/arduino-and-electronics/outputs-beyond-the-led.html) | Engineering | 1849 | 8 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Soldering](../lessons/engineering/arduino-and-electronics/soldering.html) | Engineering | 3549 | 19 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Maglev Train Engineering](../lessons/engineering/mechanical-and-civil-design/maglev-train.html) | Engineering | 938 | 10 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Tools & Machines Sort](../lessons/engineering/mechanical-and-civil-design/tools-and-machines-sort.html) | Engineering | 834 | 10 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Archimedes' Principle](../lessons/physics/mechanics/archimedes-principle.html) | Physics | 1518 | 12 | `assertion-without-mechanism` `no-worked-example` `unqualified-legend` |
| medium | 5 | [Navier-Stokes Equations](../lessons/physics/modern-and-thermal/navier-stokes.html) | Physics | 526 | 8 | `short-explanation` `assertion-without-mechanism` `no-worked-example` |
| medium | 5 | [Analog Mixer Lab: Patch, Gain & FX Bus](../lessons/technical-elements/audio-mixer-signal-flow.html) | Technical Elements | 2715 | 42 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [EQ: Find the Problem Frequency](../lessons/technical-elements/eq-problem-frequency.html) | Technical Elements | 1304 | 21 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Live Audio Signal Chain](../lessons/technical-elements/live-audio-signal-chain.html) | Technical Elements | 2535 | 16 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 5 | [Projection & Throw-Ratio Lab](../lessons/technical-elements/projection-throw-ratio-lab.html) | Technical Elements | 475 | 5 | `short-explanation` `assertion-without-mechanism` `no-worked-example` |
| medium | 5 | [Stage Plotting](../lessons/technical-elements/stage-plotting.html) | Technical Elements | 903 | 21 | `assertion-without-mechanism` `no-worked-example` `no-quantitative-model` |
| medium | 4 | [2D Game Developer Pathway](../lessons/2d-game-dev/2d-pathway.html) | Computer Science | 908 | 105 | `demo-without-explanation` `assertion-without-mechanism` |
| medium | 4 | [Animation State Machines](../lessons/2d-game-dev/animation-states.html) | Computer Science | 880 | 105 | `demo-without-explanation` `assertion-without-mechanism` |
| medium | 4 | [Game Loop & Rendering](../lessons/2d-game-dev/game-loop-rendering.html) | Computer Science | 1058 | 105 | `demo-without-explanation` `assertion-without-mechanism` |
| medium | 4 | [Level Design & Game Feel](../lessons/2d-game-dev/level-design-game-feel.html) | Computer Science | 989 | 105 | `demo-without-explanation` `assertion-without-mechanism` |
| medium | 4 | [Pixel Art & Sprites](../lessons/2d-game-dev/pixel-art-sprites.html) | Computer Science | 1109 | 105 | `demo-without-explanation` `assertion-without-mechanism` |
| medium | 4 | [Movement & Jump Feel](../lessons/2d-game-dev/platformer-movement.html) | Computer Science | 997 | 105 | `demo-without-explanation` `assertion-without-mechanism` |
| medium | 4 | [Menus, Saving & Shipping](../lessons/2d-game-dev/ship-your-2d-game.html) | Computer Science | 970 | 105 | `demo-without-explanation` `assertion-without-mechanism` |
| medium | 4 | [Bandsaw Design Lab — Cuts, Curves & Creative Inventions](../lessons/applied-physics-materials/bandsaw-design.html) | Applied Physics & Materials Science | 2807 | 18 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Materials Selection Lab](../lessons/applied-physics-materials/materials-selection-lab.html) | Applied Physics & Materials Science | 648 | 6 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Optics — Mirrors, Lenses & Light](../lessons/applied-physics-materials/optics.html) | Applied Physics & Materials Science | 677 | 10 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Print-in-Place Fidgets — The Spiral Cone](../lessons/applied-physics-materials/print-fidgets.html) | Applied Physics & Materials Science | 6174 | 34 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Viscosimeter](../lessons/applied-physics-materials/viscosimeter.html) | Applied Physics & Materials Science | 604 | 9 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Virtual Reality — How It Works & How to Build It](../lessons/applied-physics-materials/vr-technology.html) | Applied Physics & Materials Science | 1621 | 34 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Furniture Design](../lessons/blender/blender-furniture-design.html) | Applied Physics & Materials Science | 2632 | 17 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Lavoisier and the Conservation of Mass](../lessons/chemistry/lavoisier-conservation.html) | Chemistry | 515 | 0 | `short-explanation` `no-worked-example` `no-quantitative-model` |
| medium | 4 | [Plastics: Polymer Chemistry & Materials](../lessons/chemistry/plastics.html) | Chemistry | 1311 | 8 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [AI Chess Through History](../lessons/computer-science/algorithms-and-ai/chess-ai-core.html) | Computer Science | 2156 | 63 | `assertion-without-mechanism` `no-sources` |
| medium | 4 | [Perceptron Lab](../lessons/computer-science/algorithms-and-ai/perceptron-lab.html) | Computer Science | 3287 | 42 | `assertion-without-mechanism` `no-sources` |
| medium | 4 | [CGI Water: From Physics to Pixels](../lessons/computer-science/graphics-and-games/cgi-water.html) | Computer Science | 2319 | 10 | `assertion-without-mechanism` `no-sources` |
| medium | 4 | [Perlin Noise](../lessons/computer-science/graphics-and-games/perlin-noise.html) | Computer Science | 2058 | 37 | `assertion-without-mechanism` `no-sources` |
| medium | 4 | [Tycho Brahe — The Last Naked-Eye Astronomer](../lessons/cosmology/tycho-brahe.html) | Cosmology | 2818 | 10 | `assertion-without-mechanism` `no-sources` |
| medium | 4 | [Universe Expansion](../lessons/cosmology/universe-expansion.html) | Cosmology | 1978 | 14 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Pablo Picasso](../lessons/design/pablo-picasso.html) | Visual Perception & Design | 1524 | 0 | `assertion-without-mechanism` `no-sources` |
| medium | 4 | [Pangaea & Continental Drift](../lessons/earth-science/pangaea-continental-drift.html) | Earth Science | 986 | 14 | `assertion-without-mechanism` `no-check-for-understanding` |
| medium | 4 | [Arduino: The Robot Brain](../lessons/engineering/arduino-and-electronics/arduino-robot-brain.html) | Engineering | 1514 | 33 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Breadboard Basics](../lessons/engineering/arduino-and-electronics/breadboard-basics.html) | Engineering | 2910 | 49 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Capacitors & RC Time](../lessons/engineering/arduino-and-electronics/capacitors-rc-time.html) | Engineering | 1680 | 20 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Inputs: Beyond the Button](../lessons/engineering/arduino-and-electronics/inputs-beyond-the-button.html) | Engineering | 1848 | 12 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [From Transistor to Logic Gate](../lessons/engineering/arduino-and-electronics/transistor-to-logic-gate.html) | Engineering | 1912 | 27 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Simple Machines Lab](../lessons/engineering/mechanical-and-civil-design/simple-machines-lab.html) | Engineering | 506 | 4 | `short-explanation` `assertion-without-mechanism` `no-quantitative-model` |
| medium | 4 | [Emily Roebling](../lessons/engineering/pioneers/emily-roebling.html) | Engineering | 1593 | 0 | `assertion-without-mechanism` `no-sources` |
| medium | 4 | [Hedy Lamarr](../lessons/engineering/pioneers/hedy-lamarr.html) | Engineering | 1570 | 0 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Henry Ford](../lessons/engineering/pioneers/henry-ford.html) | Engineering | 1606 | 0 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Leonardo da Vinci](../lessons/humanities/leonardo-da-vinci.html) | Complex Systems & Humanities | 1854 | 6 | `assertion-without-mechanism` `no-check-for-understanding` |
| medium | 4 | [Language Foundations Lab](../lessons/language-literature/language-foundations-lab.html) | Language & Literature | 1166 | 18 | `assertion-without-mechanism` `no-sources` |
| medium | 4 | [Snap, Crackle, Pop: The Ladder of Time Derivatives](../lessons/mathematics/advanced-and-calculus/time-derivatives-snap-crackle-pop.html) | Mathematics | 1415 | 15 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [The Unit Factory](../lessons/mathematics/algebra/unit-factory.html) | Mathematics | 678 | 20 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Pi & Circles](../lessons/mathematics/geometry-and-trigonometry/pi.html) | Mathematics | 1045 | 114 | `demo-without-explanation` `assertion-without-mechanism` |
| medium | 4 | [How Spread Out?](../lessons/mathematics/statistics-and-probability/how-spread-out.html) | Mathematics | 751 | 12 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Fake Book: Lead Sheets, Variations & Play-Along](../lessons/music/fake-book.html) | Music | 4205 | 496 | `demo-without-explanation` `assertion-without-mechanism` |
| medium | 4 | [Sheet Music Trainer](../lessons/music/sheet-music-trainer.html) | Music | 1647 | 87 | `assertion-without-mechanism` `no-sources` |
| medium | 4 | [Cathode Ray Tube](../lessons/physics/electricity-and-magnetism/cathode-ray-tube.html) | Physics | 784 | 10 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Coulomb's Law](../lessons/physics/electricity-and-magnetism/coulombs-law.html) | Physics | 996 | 11 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [The Falling Coil](../lessons/physics/electricity-and-magnetism/falling-coil.html) | Physics | 857 | 12 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Faraday's Law](../lessons/physics/electricity-and-magnetism/faradays-law.html) | Physics | 836 | 4 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Van de Graaff Balloon](../lessons/physics/electricity-and-magnetism/van-de-graaff-balloon.html) | Physics | 935 | 15 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Van de Graaff Generator](../lessons/physics/electricity-and-magnetism/van-de-graaff-generator.html) | Physics | 929 | 10 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Biomechanics: The Physics of Sports](../lessons/physics/mechanics/biomechanics-physics-of-sports.html) | Physics | 2168 | 11 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Conservation of Energy](../lessons/physics/mechanics/conservation-of-energy.html) | Physics | 1912 | 8 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Conservation of Momentum](../lessons/physics/mechanics/conservation-of-momentum.html) | Physics | 1816 | 6 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Fundamental Forces](../lessons/physics/mechanics/fundamental-forces.html) | Physics | 2237 | 4 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Kinematics: Motion, Speed & Acceleration](../lessons/physics/mechanics/kinematics.html) | Physics | 2257 | 8 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Levers: The Original Force Multiplier](../lessons/physics/mechanics/levers.html) | Physics | 3388 | 15 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [The Pendulum](../lessons/physics/mechanics/pendulum.html) | Physics | 678 | 16 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Wheel & Axle](../lessons/physics/mechanics/wheel-and-axle.html) | Physics | 3861 | 13 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Benjamin Franklin](../lessons/physics/pioneers/benjamin-franklin.html) | Physics | 1802 | 0 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [James Clerk Maxwell](../lessons/physics/pioneers/james-clerk-maxwell.html) | Physics | 2141 | 25 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Marie Curie](../lessons/physics/pioneers/marie-curie.html) | Physics | 2339 | 11 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Nikola Tesla](../lessons/physics/pioneers/nikola-tesla.html) | Physics | 1817 | 11 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Audio Compression: Taming Dynamics](../lessons/technical-elements/audio-compression.html) | Technical Elements | 1158 | 16 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Microphone Polar Pattern Lab](../lessons/technical-elements/microphone-polar-patterns.html) | Technical Elements | 809 | 9 | `assertion-without-mechanism` `no-worked-example` |
| medium | 4 | [Walt Disney](../lessons/technical-elements/walt-disney.html) | Technical Elements | 1938 | 0 | `assertion-without-mechanism` `no-worked-example` |

303 low-risk lessons omitted; see the JSON for every metric.
