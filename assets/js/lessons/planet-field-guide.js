(() => {
  'use strict';

  const LAYER_DATA = {
    mercury: [
      {
        name: 'Giant Metallic Core',
        rFrac: 0.83,
        color: '#f59e0b',
        radius: '~2,020 km (83% of planet radius)',
        comp: 'Molten outer & solid inner iron-nickel core',
        temp: '~1,800–2,000 K',
        note: 'Mercury’s iron core takes up roughly 85% of its radius—proportionally far larger than Earth’s—likely because an early giant impact or solar-nebula sorting stripped away lighter rock.'
      },
      {
        name: 'Thin Silicate Mantle',
        rFrac: 0.96,
        color: '#b45309',
        radius: '~400 km thick',
        comp: 'Magnesium- and iron-rich silicate rock',
        temp: '~900–1,600 K',
        note: 'Because the mantle cooled and contracted over billions of years, the brittle crust above buckled into towering cliff-like ridges called lobate scarps.'
      },
      {
        name: 'Cratered Crust',
        rFrac: 1.0,
        color: '#9ca3af',
        radius: '~35 km thick',
        comp: 'Low-iron basaltic rock and impact breccia',
        temp: '−180 °C night to +430 °C day',
        note: 'With virtually no atmosphere or plate tectonics to erase scars, Mercury preserves billions of years of impact craters—including permanently shadowed polar craters holding water ice.'
      }
    ],
    venus: [
      {
        name: 'Iron-Nickel Core',
        rFrac: 0.52,
        color: '#f97316',
        radius: '~3,150 km',
        comp: 'Dense iron-nickel alloy (likely partially liquid)',
        temp: '~5,100 K',
        note: 'Despite an Earth-sized iron core, Venus lacks a strong global magnetic field—likely because its ultra-slow 243-day backward spin prevents vigorous core dynamo convection.'
      },
      {
        name: 'Rocky Mantle',
        rFrac: 0.95,
        color: '#dc2626',
        radius: '~2,850 km thick',
        comp: 'Hot silicate peridotite rock',
        temp: '~1,400–4,000 K',
        note: 'Heat from Venus’s mantle escapes through widespread volcanism and periodic crust resurfacing rather than Earth-style moving tectonic plates.'
      },
      {
        name: 'Basaltic Crust & Supercritical CO₂',
        rFrac: 0.98,
        color: '#a16207',
        radius: 'Surface at 92 bar pressure',
        comp: 'Volcanic basalt plains under 96.5% CO₂',
        temp: '+465 °C (hotter than lead’s melting point)',
        note: 'At 92 times Earth’s sea-level pressure, carbon dioxide at the surface behaves like a dense supercritical fluid rather than an ordinary gas.'
      },
      {
        name: 'Sulfuric-Acid Cloud Deck',
        rFrac: 1.0,
        color: '#fde68a',
        radius: '48–68 km altitude',
        comp: 'Concentrated H₂SO₄ droplets & CO₂ haze',
        temp: '+20 °C to −40 °C in upper clouds',
        note: 'These bright clouds reflect ~76% of incoming sunlight, making Venus the brightest planet in Earth’s sky while completely hiding its volcanic surface.'
      }
    ],
    mars: [
      {
        name: 'Liquid Iron-Sulfur Core',
        rFrac: 0.54,
        color: '#f59e0b',
        radius: '~1,830 km (NASA InSight measurement)',
        comp: 'Liquid iron alloyed with sulfur, oxygen, and hydrogen',
        temp: '~2,000 K',
        note: 'Seismic waves recorded by NASA’s InSight lander proved Mars’s core is completely molten and enriched in light elements, explaining why its ancient magnetic dynamo shut down.'
      },
      {
        name: 'Silicate Mantle',
        rFrac: 0.95,
        color: '#b91c1c',
        radius: '~1,500 km thick',
        comp: 'Silicate minerals (olivine and pyroxene)',
        temp: '~1,000–1,900 K',
        note: 'Without Earth-like plate tectonics, a single stationary mantle plume fed magma to the Tharsis bulge for billions of years—building Olympus Mons to 21.9 km high.'
      },
      {
        name: 'Iron-Oxide Crust & Thin CO₂ Air',
        rFrac: 1.0,
        color: '#d97706',
        radius: '24–72 km crust · 0.006 bar atmosphere',
        comp: 'Basaltic rock dusted with iron(III) oxide rust',
        temp: '−140 °C to +20 °C (average −65 °C)',
        note: 'Ancient river deltas and clay minerals prove liquid water once flowed here, when Mars had a thicker atmosphere before solar wind stripped much of it away.'
      }
    ],
    jupiter: [
      {
        name: 'Dilute Heavy-Element Core',
        rFrac: 0.25,
        color: '#93c5fd',
        radius: '~15,000–25,000 km (fuzzy boundary)',
        comp: 'Rock, ices, and dense metallic hydrogen mixture',
        temp: '~20,000–25,000 K',
        note: 'NASA’s Juno gravity measurements revealed Jupiter’s core is not a sharp solid ball—it is partially dissolved into the surrounding metallic hydrogen.'
      },
      {
        name: 'Liquid Metallic Hydrogen',
        rFrac: 0.78,
        color: '#60a5fa',
        radius: '~40,000 km thick',
        comp: 'Pressure-ionized liquid protons and free electrons',
        temp: '~10,000–20,000 K',
        note: 'Under millions of bars of pressure, hydrogen turns into an electrically conducting liquid metal; Jupiter’s fast 9.9-hour spin turns this layer into the solar system’s strongest planetary dynamo.'
      },
      {
        name: 'Molecular Hydrogen Envelope & Cloud Bands',
        rFrac: 1.0,
        color: '#d2a679',
        radius: 'Outer ~15,000 km',
        comp: 'H₂, He, plus ammonia, ammonium hydrosulfide, and water clouds',
        temp: '−145 °C at 1-bar cloud tops',
        note: 'There is no solid ground to land on—gas smoothly compresses into supercritical fluid as depth and pressure rise.'
      }
    ],
    saturn: [
      {
        name: 'Dense Core',
        rFrac: 0.28,
        color: '#fde68a',
        radius: '~15,000–18,000 km',
        comp: 'Silicate rock, water ice, and heavy elements',
        temp: '~12,000 K',
        note: 'Cassini ring seismology showed Saturn’s core is diffuse and sloshes slightly, sending subtle spiral wave patterns outward into its rings.'
      },
      {
        name: 'Liquid Metallic Hydrogen',
        rFrac: 0.62,
        color: '#93c5fd',
        radius: '~20,000 km thick',
        comp: 'Electrically conducting metallic hydrogen & helium rain',
        temp: '~6,000–11,000 K',
        note: 'Helium droplets may condense and fall like rain toward the core, releasing gravitational heat that makes Saturn radiate more energy than it receives.'
      },
      {
        name: 'Molecular H₂ Atmosphere & Hexagonal Jet',
        rFrac: 0.90,
        color: '#e8cf9c',
        radius: 'Mean bulk density: 0.687 g/cm³',
        comp: '96% hydrogen, 3% helium, ammonia ice clouds',
        temp: '−178 °C at 1-bar level',
        note: 'Saturn’s huge low-density gas envelope gives it an average density lower than liquid water.'
      },
      {
        name: 'Icy Ring System',
        rFrac: 1.0,
        color: '#f8fafc',
        radius: '70,000 to 140,000 km from center (~10 m thick)',
        comp: '99% pure water ice from dust grains to house-sized blocks',
        temp: '−160 °C to −200 °C',
        note: 'The rings sit inside Saturn’s Roche limit, where tidal gravity prevents icy fragments from coalescing into a single large moon.'
      }
    ],
    uranus: [
      {
        name: 'Rocky Silicate-Iron Core',
        rFrac: 0.22,
        color: '#94a3b8',
        radius: '~5,500 km',
        comp: 'Silicate rock and iron-nickel',
        temp: '~5,000 K',
        note: 'Unlike Jupiter and Saturn, Uranus has a relatively small rock core surrounded by a massive mantle of hot high-pressure ices.'
      },
      {
        name: 'Superionic Water-Ammonia-Methane Mantle',
        rFrac: 0.80,
        color: '#38bdf8',
        radius: '~15,000 km thick',
        comp: 'Hot, dense fluid of H₂O, NH₃, and CH₄ (“ices”)',
        temp: '~2,000–5,000 K',
        note: 'Planetary scientists call these compounds “ices” chemically, even though at mantle pressures they form a scorching, electrically conducting ionic ocean that powers Uranus’s tilted magnetic field.'
      },
      {
        name: 'Hydrogen-Helium-Methane Atmosphere',
        rFrac: 1.0,
        color: '#7fd8e8',
        radius: 'Outer ~5,000 km',
        comp: '83% H₂, 15% He, 2.3% methane (CH₄)',
        temp: '−224 °C (coldest planetary atmosphere)',
        note: 'Methane gas absorbs red sunlight and scatters blue-cyan wavelengths back to space, giving Uranus its pale aqua color.'
      }
    ],
    neptune: [
      {
        name: 'Rocky Core',
        rFrac: 0.26,
        color: '#94a3b8',
        radius: '~6,500 km (~1.2 Earth masses)',
        comp: 'Iron, nickel, and silicates',
        temp: '~5,400 K',
        note: 'Neptune is slightly smaller than Uranus in radius yet 17% more massive, packing denser rock and compressed ices inside.'
      },
      {
        name: 'High-Pressure Ice Mantle',
        rFrac: 0.82,
        color: '#2563eb',
        radius: '~14,000 km thick',
        comp: 'Hot pressurized water, ammonia, and methane fluid',
        temp: '~2,000–5,000 K',
        note: 'Extreme pressures here may split methane molecules, forming carbon crystals that sink deeper as “diamond rain.”'
      },
      {
        name: 'Stormy Methane-Rich Atmosphere',
        rFrac: 1.0,
        color: '#5b7fe8',
        radius: 'Outer ~4,500 km',
        comp: '80% H₂, 19% He, ~1.5% methane + cirrus ice clouds',
        temp: '−214 °C at 1-bar level',
        note: 'Internal heat radiates 2.6× as much energy as Neptune receives from the distant Sun, fueling winds up to 2,100 km/h.'
      }
    ]
  };

  function initLayers(section) {
    const slug = section.dataset.planetLayers;
    const layers = LAYER_DATA[slug];
    if (!layers) return;

    const canvas = section.querySelector('canvas');
    const tabWrap = section.querySelector('[data-layer-tabs]');
    const titleEl = section.querySelector('[data-layer-title]');
    const radiusEl = section.querySelector('[data-layer-radius]');
    const compEl = section.querySelector('[data-layer-comp]');
    const tempEl = section.querySelector('[data-layer-temp]');
    const noteEl = section.querySelector('[data-layer-note]');
    if (!canvas || !tabWrap || !window.SimKit) return;

    let activeIdx = layers.length - 1;
    let view = null;
    view = window.SimKit.canvas2d(canvas, { height: 240, onResize: () => draw() });

    function draw() {
      if (!view) return;
      const { ctx, width: W, height: H } = view;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#030711';
      ctx.fillRect(0, 0, W, H);

      const cx = W * 0.5;
      const cy = H * 0.5;
      const maxR = Math.min(W, H) * 0.42;

      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const r = layer.rFrac * maxR;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = layer.color;
        ctx.globalAlpha = i === activeIdx ? 1.0 : 0.45;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = i === activeIdx ? '#ffffff' : 'rgba(255,255,255,0.28)';
        ctx.lineWidth = i === activeIdx ? 2.5 : 1;
        ctx.stroke();
      }
    }

    function select(idx) {
      activeIdx = idx;
      const layer = layers[idx];
      tabWrap.querySelectorAll('button').forEach((btn, i) => {
        btn.setAttribute('aria-selected', String(i === idx));
      });
      titleEl.textContent = layer.name;
      radiusEl.textContent = layer.radius;
      compEl.textContent = layer.comp;
      tempEl.textContent = layer.temp;
      noteEl.textContent = layer.note;
      draw();
    }

    tabWrap.innerHTML = '';
    layers.forEach((layer, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pfg-btn';
      btn.setAttribute('role', 'tab');
      btn.textContent = layer.name;
      btn.addEventListener('click', () => select(idx));
      tabWrap.appendChild(btn);
    });

    select(layers.length - 1);
  }

  function initMercurySim(section) {
    const canvas = section.querySelector('canvas');
    const orbitSl = section.querySelector('[data-sim-orbit]');
    const orbitOut = section.querySelector('[data-sim-orbit-out]');
    const atmoToggle = section.querySelector('[data-sim-atmo]');
    const playBtn = section.querySelector('[data-sim-play]');
    const dayOut = section.querySelector('[data-out-day]');
    const tempOut = section.querySelector('[data-out-temp]');
    const solarOut = section.querySelector('[data-out-solar]');
    let view = null;
    view = window.SimKit.canvas2d(canvas, { height: 280, onResize: () => draw() });

    let orbits = 0; // 0 to 2 Mercury orbits
    let playing = true;
    let earthCompare = false;

    function updateReadouts() {
      orbitOut.textContent = `${orbits.toFixed(2)} Mercury yr`;
      // 3:2 spin-orbit resonance: sidereal spin angle = 1.5 * orbitAngle
      const orbitAngle = orbits * Math.PI * 2;
      const spinAngle = 1.5 * orbitAngle;
      // Angle between marker direction and Sun direction
      const sunDir = orbitAngle + Math.PI;
      const rel = Math.cos(spinAngle - sunDir);
      let tempC;
      if (earthCompare) {
        // Hypothetical Earth-like thick air at 0.39 AU buffers swing
        tempC = 190 + rel * 22;
      } else {
        tempC = 125 + rel * 305; // +430°C noon to -180°C midnight
      }
      const solarDays = orbits / 2;
      dayOut.textContent = `${solarDays.toFixed(2)} Mercury solar days`;
      tempOut.textContent = `${tempC >= 0 ? '+' : ''}${Math.round(tempC)} °C`;
      solarOut.textContent = rel > 0.5 ? 'High Noon (scorching)' : rel < -0.5 ? 'Deep Midnight (freezing)' : 'Dawn / Dusk';
    }

    function draw() {
      if (!view) return;
      const { ctx, width: W, height: H } = view;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#030711';
      ctx.fillRect(0, 0, W, H);

      const cx = W * 0.5;
      const cy = H * 0.5;
      const rx = Math.min(W * 0.34, 175);
      const ry = Math.min(H * 0.32, 100);

      // Orbit ring
      ctx.strokeStyle = 'rgba(180, 198, 224, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Sun
      const sunX = cx - rx * 0.2; // slight eccentricity
      const g = ctx.createRadialGradient(sunX, cy, 4, sunX, cy, 26);
      g.addColorStop(0, '#fff7cc');
      g.addColorStop(0.5, '#f59e0b');
      g.addColorStop(1, 'rgba(245,158,11,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sunX, cy, 26, 0, Math.PI * 2);
      ctx.fill();

      const ang = orbits * Math.PI * 2;
      const px = cx + Math.cos(ang) * rx;
      const py = cy + Math.sin(ang) * ry;

      // Mercury disk
      const pr = 18;
      const toSun = Math.atan2(cy - py, sunX - px);
      ctx.save();
      ctx.translate(px, py);
      // Day / night half
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, 0, pr, toSun - Math.PI / 2, toSun + Math.PI / 2);
      ctx.closePath();
      ctx.fill();

      // Spin marker (rotates 1.5x per orbit)
      const spinAng = 1.5 * ang;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(spinAng) * (pr + 4), Math.sin(spinAng) * (pr + 4));
      ctx.stroke();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(Math.cos(spinAng) * pr, Math.sin(spinAng) * pr, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#c8d7ec';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText('Orange pin = fixed surface crater (3 spins per 2 orbits)', 14, H - 12);
    }

    orbitSl.addEventListener('input', () => {
      orbits = Number(orbitSl.value);
      updateReadouts();
      draw();
    });

    atmoToggle.addEventListener('click', () => {
      earthCompare = !earthCompare;
      atmoToggle.setAttribute('aria-pressed', String(earthCompare));
      atmoToggle.textContent = earthCompare ? 'Mode: With Thick Atmosphere' : 'Mode: Airless Mercury (Actual)';
      updateReadouts();
    });

    playBtn.addEventListener('click', () => {
      playing = !playing;
      playBtn.setAttribute('aria-pressed', String(playing));
      playBtn.textContent = playing ? 'Pause Orbit' : 'Play Orbit';
    });

    updateReadouts();
    draw();
    window.SimKit.loop(dt => {
      if (!playing) return;
      orbits = (orbits + dt * 0.22) % 2;
      orbitSl.value = orbits.toFixed(2);
      updateReadouts();
      draw();
    }, { el: canvas, maxDt: 0.05 });
  }

  function initVenusSim(section) {
    const canvas = section.querySelector('canvas');
    const altSl = section.querySelector('[data-sim-alt]');
    const altOut = section.querySelector('[data-sim-alt-out]');
    const ghToggle = section.querySelector('[data-sim-gh]');
    const presOut = section.querySelector('[data-out-pres]');
    const tempOut = section.querySelector('[data-out-temp]');
    const zoneOut = section.querySelector('[data-out-zone]');
    let view = null;
    view = window.SimKit.canvas2d(canvas, { height: 280, onResize: () => draw() });

    let altKm = 55;
    let greenhouse = true;

    function metrics() {
      // Approximate Venus VIRA atmospheric profile: 92 bar at 0 km, ~1 bar at 50 km, ~0.04 bar at 70 km
      const pressure = 92 * Math.exp(-altKm / 15.9 * (1 + altKm / 260));
      const baseNoGh = -41 + (70 - altKm) * 0.9;
      const actualTemp = 465 - altKm * 7.5 + (altKm > 55 ? (altKm - 55) * 1.4 : 0);
      const tempC = greenhouse ? actualTemp : baseNoGh;
      let zone = 'Upper Haze';
      if (altKm < 5) zone = 'Supercritical CO₂ Furnace (92 bar)';
      else if (altKm < 47) zone = 'Crushing Lower CO₂ Atmosphere';
      else if (altKm <= 65) zone = 'Sulfuric-Acid Cloud Deck (~1 bar, ~20 °C)';
      return { pressure, tempC, zone };
    }

    function updateReadouts() {
      const m = metrics();
      altOut.textContent = `${altKm.toFixed(0)} km`;
      presOut.textContent = m.pressure >= 1 ? `${m.pressure.toFixed(1)} bar (~${Math.round(m.pressure * 10)} m ocean eq.)` : `${m.pressure.toFixed(2)} bar`;
      tempOut.textContent = `${m.tempC >= 0 ? '+' : ''}${Math.round(m.tempC)} °C`;
      zoneOut.textContent = greenhouse ? m.zone : 'No CO₂ Greenhouse (Bare Rock Model)';
    }

    function draw() {
      if (!view) return;
      const { ctx, width: W, height: H } = view;
      ctx.clearRect(0, 0, W, H);
      const m = metrics();

      // Atmospheric column gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#071022');
      sky.addColorStop(0.28, '#927848');
      sky.addColorStop(0.45, '#d9b578');
      sky.addColorStop(0.88, '#9a4318');
      sky.addColorStop(1, '#451a03');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Cloud band (48-65 km mapped to y)
      const yOf = km => 24 + ((70 - km) / 70) * (H - 52);
      const yCloudTop = yOf(65);
      const yCloudBot = yOf(48);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
      ctx.fillRect(0, yCloudTop, W, yCloudBot - yCloudTop);

      // Altitude ticks
      ctx.fillStyle = '#edf4ff';
      ctx.font = '11px Inter, system-ui, sans-serif';
      [70, 50, 25, 0].forEach(km => {
        const y = yOf(km);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.fillText(`${km} km`, 10, y - 4);
      });
      ctx.fillText('Sulfuric acid clouds (48–65 km)', 74, (yCloudTop + yCloudBot) / 2 + 4);

      // Probe icon at altKm
      const py = yOf(altKm);
      const px = W * 0.68;
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.fillText(`Probe: ${Math.round(m.tempC)} °C · ${m.pressure.toFixed(1)} bar`, px - 145, py - 14);
    }

    altSl.addEventListener('input', () => {
      altKm = Number(altSl.value);
      updateReadouts();
      draw();
    });
    ghToggle.addEventListener('click', () => {
      greenhouse = !greenhouse;
      ghToggle.setAttribute('aria-pressed', String(greenhouse));
      ghToggle.textContent = greenhouse ? 'Greenhouse: Active (96.5% CO₂)' : 'Greenhouse: Off (Comparison)';
      updateReadouts();
      draw();
    });

    updateReadouts();
    draw();
  }

  function initMarsSim(section) {
    const canvas = section.querySelector('canvas');
    const presSl = section.querySelector('[data-sim-pres]');
    const tempSl = section.querySelector('[data-sim-temp]');
    const presOut = section.querySelector('[data-sim-pres-out]');
    const tempOut = section.querySelector('[data-sim-temp-out]');
    const phaseOut = section.querySelector('[data-out-phase]');
    const eraOut = section.querySelector('[data-out-era]');
    const todayBtn = section.querySelector('[data-preset-today]');
    const ancientBtn = section.querySelector('[data-preset-ancient]');
    let view = null;
    view = window.SimKit.canvas2d(canvas, { height: 280, onResize: () => draw() });

    let logP = -2.22; // 10^-2.22 = 0.006 bar (modern Mars)
    let tempC = -40;

    function phaseAt(pBar, tC) {
      if (pBar < 0.0061) {
        return tC < -60 ? 'Solid Ice (sublimates on warming)' : 'Water Vapor (cannot stay liquid)';
      }
      // Simplified melting/boiling curves above triple point
      const tBoil = 100 + 28 * Math.log10(pBar);
      if (tC < 0) return 'Solid Water Ice';
      if (tC <= tBoil) return 'Stable Liquid Water!';
      return 'Water Vapor (Boils)';
    }

    function updateReadouts() {
      const pBar = Math.pow(10, logP);
      presOut.textContent = pBar < 0.05 ? `${pBar.toFixed(4)} bar` : `${pBar.toFixed(2)} bar`;
      tempOut.textContent = `${tempC >= 0 ? '+' : ''}${tempC.toFixed(0)} °C`;
      const ph = phaseAt(pBar, tempC);
      phaseOut.textContent = ph;
      eraOut.textContent = pBar < 0.01 ? 'Modern Mars (~0.006 bar)' : pBar > 0.4 ? 'Ancient River-Era Mars (~0.5–1 bar)' : 'Transitional Thin Air';
    }

    function draw() {
      if (!view) return;
      const { ctx, width: W, height: H } = view;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#030711';
      ctx.fillRect(0, 0, W, H);

      const padL = 56;
      const padR = 20;
      const padT = 22;
      const padB = H - 30;
      const pw = W - padL - padR;
      const ph = padB - padT;

      const xOf = t => padL + ((t + 120) / 240) * pw; // -120 to +120 C
      const yOf = lp => padB - ((lp + 3) / 3.5) * ph; // 10^-3 to 10^0.5 bar

      // Triple point: (0.01 C, log10(0.0061) = -2.21)
      const tpX = xOf(0.01);
      const tpY = yOf(-2.21);

      // Liquid region polygon
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.moveTo(tpX, tpY);
      ctx.lineTo(xOf(0), yOf(0.5));
      ctx.lineTo(xOf(120), yOf(0.5));
      for (let t = 120; t >= 0; t -= 5) {
        const lp = (t - 100) / 28;
        ctx.lineTo(xOf(t), Math.min(padB, Math.max(padT, yOf(lp))));
      }
      ctx.closePath();
      ctx.fill();

      // Axes & triple point
      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, padB);
      ctx.lineTo(padL + pw, padB);
      ctx.stroke();

      // Phase boundaries
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xOf(-120), yOf(-3));
      ctx.lineTo(tpX, tpY);
      ctx.lineTo(xOf(0), yOf(0.5));
      ctx.moveTo(tpX, tpY);
      ctx.lineTo(xOf(114), yOf(0.5));
      ctx.stroke();

      ctx.fillStyle = '#c8d7ec';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.fillText('ICE', padL + 22, padT + 42);
      ctx.fillText('LIQUID', tpX + 26, padT + 42);
      ctx.fillText('GAS', padL + pw - 52, padB - 18);
      ctx.fillText('Temperature (°C)', padL + pw / 2 - 42, H - 8);
      ctx.fillText('1 bar', 8, yOf(0) + 4);
      ctx.fillText('6 mbar', 6, yOf(-2.22) + 4);

      // Current point
      const cx = xOf(tempC);
      const cy = yOf(logP);
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function syncInputs() {
      presSl.value = logP.toFixed(2);
      tempSl.value = tempC.toFixed(0);
      updateReadouts();
      draw();
    }

    presSl.addEventListener('input', () => {
      logP = Number(presSl.value);
      updateReadouts();
      draw();
    });
    tempSl.addEventListener('input', () => {
      tempC = Number(tempSl.value);
      updateReadouts();
      draw();
    });
    todayBtn.addEventListener('click', () => {
      logP = -2.22;
      tempC = -50;
      syncInputs();
    });
    ancientBtn.addEventListener('click', () => {
      logP = -0.15; // ~0.71 bar
      tempC = 12;
      syncInputs();
    });

    syncInputs();
  }

  function initJupiterSim(section) {
    const canvas = section.querySelector('canvas');
    const spdSl = section.querySelector('[data-sim-spd]');
    const spdOut = section.querySelector('[data-sim-spd-out]');
    const playBtn = section.querySelector('[data-sim-play]');
    const resOut = section.querySelector('[data-out-res]');
    const moonOut = section.querySelector('[data-out-moon]');
    let view = null;
    view = window.SimKit.canvas2d(canvas, { height: 290, onResize: () => draw() });

    const moons = [
      { name: 'Io', ratio: 4, r: 46, color: '#facc15', desc: '1.77-day orbit · 400+ active volcanoes from tidal flexing' },
      { name: 'Europa', ratio: 2, r: 72, color: '#cbd5e1', desc: '3.55-day orbit · icy crust over global saltwater ocean' },
      { name: 'Ganymede', ratio: 1, r: 102, color: '#94a3b8', desc: '7.15-day orbit · largest moon in solar system (bigger than Mercury)' },
      { name: 'Callisto', ratio: 0.428, r: 134, color: '#64748b', desc: '16.69-day orbit · ancient cratered world outside resonance' }
    ];

    let t = 0;
    let speed = 1;
    let playing = true;
    let selectedMoon = moons[0];

    section.querySelectorAll('[data-galilean]').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        selectedMoon = moons[idx];
        section.querySelectorAll('[data-galilean]').forEach((b, j) => b.setAttribute('aria-pressed', String(j === idx)));
        moonOut.textContent = `${selectedMoon.name}: ${selectedMoon.desc}`;
      });
    });

    function draw() {
      if (!view) return;
      const { ctx, width: W, height: H } = view;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#030711';
      ctx.fillRect(0, 0, W, H);

      const cx = W * 0.5;
      const cy = H * 0.5;
      const scale = Math.min(W, H) / 310;

      // Jupiter
      ctx.fillStyle = '#d2a679';
      ctx.beginPath();
      ctx.arc(cx, cy, 18 * scale, 0, Math.PI * 2);
      ctx.fill();

      const angles = moons.map(m => t * m.ratio);
      moons.forEach((m, i) => {
        const rr = m.r * scale;
        ctx.strokeStyle = m === selectedMoon ? 'rgba(169, 221, 255, 0.55)' : 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = m === selectedMoon ? 1.8 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();

        const mx = cx + Math.cos(angles[i]) * rr;
        const my = cy + Math.sin(angles[i]) * rr;
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(mx, my, m === selectedMoon ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#edf4ff';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.fillText(m.name, mx + 8, my + 4);
      });

      // Highlight Io-Europa conjunction
      const diffIE = Math.abs(Math.sin((angles[0] - angles[1]) * 0.5));
      const aligned = diffIE < 0.14;
      resOut.textContent = aligned ? 'Tidal Tug Pulse! (Io & Europa aligned)' : '4 : 2 : 1 Laplace Resonance Active';
      if (aligned) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angles[0]) * moons[0].r * scale, cy + Math.sin(angles[0]) * moons[0].r * scale);
        ctx.lineTo(cx + Math.cos(angles[1]) * moons[1].r * scale, cy + Math.sin(angles[1]) * moons[1].r * scale);
        ctx.stroke();
      }
    }

    spdSl.addEventListener('input', () => {
      speed = Number(spdSl.value);
      spdOut.textContent = `${speed.toFixed(1)}×`;
    });
    playBtn.addEventListener('click', () => {
      playing = !playing;
      playBtn.setAttribute('aria-pressed', String(playing));
      playBtn.textContent = playing ? 'Pause Orbits' : 'Play Orbits';
    });

    moonOut.textContent = `${selectedMoon.name}: ${selectedMoon.desc}`;
    draw();
    window.SimKit.loop(dt => {
      if (!playing) return;
      t += dt * 0.55 * speed;
      draw();
    }, { el: canvas, maxDt: 0.05 });
  }

  function initSaturnSim(section) {
    const canvas = section.querySelector('canvas');
    const distSl = section.querySelector('[data-sim-dist]');
    const distOut = section.querySelector('[data-sim-dist-out]');
    const stateOut = section.querySelector('[data-out-state]');
    const speedOut = section.querySelector('[data-out-speed]');
    let view = null;
    view = window.SimKit.canvas2d(canvas, { height: 280, onResize: () => draw() });

    let distRs = 2.8;
    let time = 0;

    function updateReadouts() {
      distOut.textContent = `${distRs.toFixed(2)} R_S`;
      const inside = distRs <= 2.44;
      stateOut.textContent = inside ? 'Inside Roche Limit → Ring Debris!' : 'Outside Roche Limit → Intact Moon';
      // Circular orbital speed around Saturn: v = sqrt(GM / r) ~ 25.1 / sqrt(r / R_S) km/s
      const vKmS = 25.1 / Math.sqrt(distRs);
      speedOut.textContent = `${vKmS.toFixed(1)} km/s`;
    }

    function draw() {
      if (!view) return;
      const { ctx, width: W, height: H } = view;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#030711';
      ctx.fillRect(0, 0, W, H);

      const cx = W * 0.5;
      const cy = H * 0.5;
      const rUnit = Math.min(W, H) * 0.125;

      // Roche limit ring at 2.44 R_S
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, 2.44 * rUnit, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Saturn globe
      ctx.fillStyle = '#e8cf9c';
      ctx.beginPath();
      ctx.arc(cx, cy, rUnit, 0, Math.PI * 2);
      ctx.fill();

      const inside = distRs <= 2.44;
      const omega = 1.6 / Math.pow(distRs, 1.5);
      const rPx = distRs * rUnit;

      if (!inside) {
        const ang = time * omega;
        const stretch = 1 + 0.35 * Math.pow(2.44 / distRs, 3);
        ctx.save();
        ctx.translate(cx + Math.cos(ang) * rPx, cy + Math.sin(ang) * rPx);
        ctx.rotate(ang);
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 * stretch, 8 / Math.sqrt(stretch), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Tidal disruption stream: inner particles overtake outer particles
        for (let i = 0; i < 72; i++) {
          const dr = ((i % 9) - 4) * 0.045;
          const rLocal = Math.max(1.22, distRs + dr);
          const omegaLocal = 1.6 / Math.pow(rLocal, 1.5);
          const ang = time * omegaLocal + i * 0.09;
          const px = cx + Math.cos(ang) * rLocal * rUnit;
          const py = cy + Math.sin(ang) * rLocal * rUnit;
          ctx.fillStyle = i % 2 === 0 ? '#e0f2fe' : '#cbd5e1';
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = '#fecaca';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.fillText('Dashed red circle = Roche limit (2.44 Saturn radii)', 12, H - 12);
    }

    distSl.addEventListener('input', () => {
      distRs = Number(distSl.value);
      updateReadouts();
      draw();
    });

    updateReadouts();
    draw();
    window.SimKit.loop(dt => {
      time += dt;
      draw();
    }, { el: canvas, maxDt: 0.05 });
  }

  function initUranusSim(section) {
    const canvas = section.querySelector('canvas');
    const yearSl = section.querySelector('[data-sim-year]');
    const yearOut = section.querySelector('[data-sim-year-out]');
    const tiltToggle = section.querySelector('[data-sim-tilt]');
    const northOut = section.querySelector('[data-out-north]');
    const southOut = section.querySelector('[data-out-south]');
    let view = null;
    view = window.SimKit.canvas2d(canvas, { height: 270, onResize: () => draw() });

    let year = 0; // 0 to 84
    let tiltDeg = 97.8;

    function updateReadouts() {
      yearOut.textContent = `Year ${year.toFixed(1)} of 84`;
      const orbitAng = (year / 84) * Math.PI * 2;
      const tiltRad = (tiltDeg * Math.PI) / 180;
      // Dot product of north pole vector [sin(tilt), 0, cos(tilt)] with sun direction [cos(orbit), sin(orbit), 0]
      const northSun = Math.sin(tiltRad) * Math.cos(orbitAng);
      const pctN = Math.round(Math.max(0, northSun) * 100);
      const pctS = Math.round(Math.max(0, -northSun) * 100);
      northOut.textContent = northSun > 0.1 ? `Daylight (${pctN}% peak)` : northSun < -0.1 ? 'Polar Night (Darkness)' : 'Equinox (Day/Night cycle)';
      southOut.textContent = -northSun > 0.1 ? `Daylight (${pctS}% peak)` : -northSun < -0.1 ? 'Polar Night (Darkness)' : 'Equinox (Day/Night cycle)';
    }

    function draw() {
      if (!view) return;
      const { ctx, width: W, height: H } = view;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#030711';
      ctx.fillRect(0, 0, W, H);

      const cx = W * 0.5;
      const cy = H * 0.5;
      const rx = Math.min(W * 0.34, 175);
      const ry = Math.min(H * 0.32, 96);

      ctx.strokeStyle = 'rgba(127, 216, 232, 0.32)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Sun
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fill();

      const ang = (year / 84) * Math.PI * 2;
      const px = cx + Math.cos(ang) * rx;
      const py = cy + Math.sin(ang) * ry;

      // Lit vs dark half facing Sun
      const toSun = Math.atan2(cy - py, cx - px);
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7fd8e8';
      ctx.beginPath();
      ctx.arc(px, py, 16, toSun - Math.PI / 2, toSun + Math.PI / 2);
      ctx.closePath();
      ctx.fill();

      // Spin axis fixed in space!
      const tiltScreen = tiltDeg > 45 ? 0.1 : 1.15;
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - Math.cos(tiltScreen) * 26, py - Math.sin(tiltScreen) * 26);
      ctx.lineTo(px + Math.cos(tiltScreen) * 26, py + Math.sin(tiltScreen) * 26);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.fillText('N', px + Math.cos(tiltScreen) * 29 - 4, py + Math.sin(tiltScreen) * 29 + 4);

      ctx.fillStyle = '#c8d7ec';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText(`Spin axis stays fixed in space (${tiltDeg}° tilt)`, 14, H - 12);
    }

    yearSl.addEventListener('input', () => {
      year = Number(yearSl.value);
      updateReadouts();
      draw();
    });
    tiltToggle.addEventListener('click', () => {
      tiltDeg = tiltDeg > 50 ? 23.4 : 97.8;
      tiltToggle.setAttribute('aria-pressed', String(tiltDeg > 50));
      tiltToggle.textContent = tiltDeg > 50 ? 'Tilt: Uranus (97.8° Sideways)' : 'Tilt: Earth-Like (23.4°)';
      updateReadouts();
      draw();
    });

    updateReadouts();
    draw();
  }

  function initNeptuneSim(section) {
    const canvas = section.querySelector('canvas');
    const heatBtn = section.querySelector('[data-sim-heat]');
    const playBtn = section.querySelector('[data-sim-play]');
    const tritonOut = section.querySelector('[data-out-triton]');
    const energyOut = section.querySelector('[data-out-energy]');
    let view = null;
    view = window.SimKit.canvas2d(canvas, { height: 280, onResize: () => draw() });

    let t = 0;
    let playing = true;
    let showBudget = false;

    function draw() {
      if (!view) return;
      const { ctx, width: W, height: H } = view;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#030711';
      ctx.fillRect(0, 0, W, H);

      if (!showBudget) {
        const cx = W * 0.5;
        const cy = H * 0.5;
        const rOrbit = Math.min(W, H) * 0.34;

        // Triton tilted retrograde orbit
        ctx.strokeStyle = 'rgba(169, 221, 255, 0.38)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, rOrbit, rOrbit * 0.65, -0.32, 0, Math.PI * 2);
        ctx.stroke();

        // Neptune spinning prograde (counterclockwise arrow)
        ctx.fillStyle = '#5b7fe8';
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.fill();
        const nepPin = -t * 2.2;
        ctx.strokeStyle = '#dbeafe';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(nepPin) * 24, cy + Math.sin(nepPin) * 24);
        ctx.stroke();

        // Triton orbiting retrograde (clockwise!)
        const trAng = t * 1.1;
        const txLocal = Math.cos(trAng) * rOrbit;
        const tyLocal = Math.sin(trAng) * rOrbit * 0.65;
        const rot = -0.32;
        const tx = cx + txLocal * Math.cos(rot) - tyLocal * Math.sin(rot);
        const ty = cy + txLocal * Math.sin(rot) + tyLocal * Math.cos(rot);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(tx, ty, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText('Triton (Retrograde)', tx + 10, ty + 4);
        ctx.fillStyle = '#c8d7ec';
        ctx.fillText('Neptune spins counterclockwise; captured moon Triton orbits clockwise!', 14, H - 12);
      } else {
        // Internal Heat Budget comparison bars
        const padL = 40;
        const barW = Math.min(280, W * 0.55);
        ctx.fillStyle = '#edf4ff';
        ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        ctx.fillText('Neptune Energy Budget at 30.1 AU', padL, 38);

        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(padL, 74, barW * 0.38, 34);
        ctx.fillStyle = '#edf4ff';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText('Incoming Sunlight (~1.5 W/m² absorbed)', padL, 64);

        ctx.fillStyle = '#fb923c';
        ctx.fillRect(padL, 152, barW, 34);
        ctx.fillStyle = '#edf4ff';
        ctx.fillText('Total Heat Radiated Out (2.6× incoming sunlight!)', padL, 142);

        ctx.fillStyle = '#fde68a';
        ctx.fillText('Extra internal heat powers supersonic 2,100 km/h winds.', padL, 232);
      }
    }

    heatBtn.addEventListener('click', () => {
      showBudget = !showBudget;
      heatBtn.setAttribute('aria-pressed', String(showBudget));
      heatBtn.textContent = showBudget ? 'View: Triton Retrograde Orbit' : 'View: 2.6× Internal Heat Budget';
      draw();
    });
    playBtn.addEventListener('click', () => {
      playing = !playing;
      playBtn.setAttribute('aria-pressed', String(playing));
      playBtn.textContent = playing ? 'Pause Orbit' : 'Play Orbit';
    });

    tritonOut.textContent = 'Retrograde (−5.88 days, 157° inclination)';
    energyOut.textContent = 'Radiates 2.6× energy received from Sun';
    draw();
    window.SimKit.loop(dt => {
      if (!playing) return;
      t += dt;
      draw();
    }, { el: canvas, maxDt: 0.05 });
  }

  function initQuizzes() {
    document.querySelectorAll('.pfg-quiz-item').forEach(item => {
      const status = item.querySelector('.pfg-quiz-status');
      const buttons = item.querySelectorAll('button[data-correct]');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const ok = btn.dataset.correct === 'true';
          status.textContent = (ok ? 'Correct! ' : 'Try again. ') + btn.dataset.explain;
          buttons.forEach(b => b.classList.toggle('is-active', b === btn));
        });
      });
    });
  }

  document.querySelectorAll('[data-planet-layers]').forEach(initLayers);
  document.querySelectorAll('[data-planet-sim]').forEach(section => {
    const slug = section.dataset.planetSim;
    if (slug === 'mercury') initMercurySim(section);
    else if (slug === 'venus') initVenusSim(section);
    else if (slug === 'mars') initMarsSim(section);
    else if (slug === 'jupiter') initJupiterSim(section);
    else if (slug === 'saturn') initSaturnSim(section);
    else if (slug === 'uranus') initUranusSim(section);
    else if (slug === 'neptune') initNeptuneSim(section);
  });
  initQuizzes();
})();
