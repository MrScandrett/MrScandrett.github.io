const SVG_NS = 'http://www.w3.org/2000/svg';

document.addEventListener('DOMContentLoaded', () => {
    const stageController = initStageSelector();
    initCycleHero(stageController);
    initSimulation(stageController);
    initUsgsDiagram();
    initStatesLab();
    initDropJourney();
    initDistributionChart();
    initTranspirationExplorer();
    initVocabularyFilter();
    initQuiz();
    initScavengerHunt();
    initContentsToggle();
    initKeyboardNavigation();
});

function initStageSelector() {
    const buttons = Array.from(document.querySelectorAll('.stage-btn'));
    const explanations = Array.from(document.querySelectorAll('.stage-explanation'));
    const pins = Array.from(document.querySelectorAll('[data-stage-pin]'));
    const stageData = [
        { name: 'Evaporation', state: 'Liquid to gas', driver: '☀️ Solar energy (happens at any temperature)' },
        { name: 'Condensation', state: 'Gas to liquid / ice', driver: '❄️ Cooling air below the dew point' },
        { name: 'Precipitation', state: 'Liquid or ice falling', driver: '⬇️ Gravity overcoming updrafts' },
        { name: 'Collection', state: 'Liquid or frozen surface water', driver: '⬇️ Gravity across land slopes' },
        { name: 'Infiltration', state: 'Liquid moving underground', driver: '⬇️ Gravity through porous soil & rock' },
        { name: 'Transpiration', state: 'Liquid to gas through plants', driver: '☀️ Sun-driven leaf evaporation & stomata' }
    ];

    let activeIndex = 0;

    function activate(index, userTriggered = false) {
        activeIndex = (index + stageData.length) % stageData.length;
        buttons.forEach((button, buttonIndex) => {
            const isActive = buttonIndex === activeIndex;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
        pins.forEach((pin) => {
            const isActive = Number(pin.dataset.stagePin) === activeIndex;
            pin.classList.toggle('is-active', isActive);
            pin.setAttribute('aria-pressed', String(isActive));
        });
        explanations.forEach((explanation, expIndex) => {
            explanation.hidden = expIndex !== activeIndex;
        });
        document.dispatchEvent(new CustomEvent('watercycle:stagechange', {
            detail: { index: activeIndex, userTriggered, ...stageData[activeIndex] }
        }));
    }

    buttons.forEach((button, index) => {
        button.addEventListener('click', () => activate(index, true));
    });
    pins.forEach((pin) => {
        pin.addEventListener('click', (event) => {
            event.stopPropagation();
            activate(Number(pin.dataset.stagePin), true);
        });
    });

    activate(0, false);

    return {
        getActiveIndex: () => activeIndex,
        getStageData: (index = activeIndex) => stageData[index],
        activate
    };
}

function initCycleHero(stageController) {
    const referenceDiagram = document.getElementById('cycle-reference-diagram');
    const playPauseBtn = document.getElementById('cycle-play-pause-btn');
    const prevBtn = document.getElementById('cycle-prev-btn');
    const nextBtn = document.getElementById('cycle-next-btn');
    const stageReadout = document.getElementById('cycle-stage-readout');
    const stateReadout = document.getElementById('cycle-state-readout');
    const tempReadout = document.getElementById('cycle-temp-readout');
    if (!referenceDiagram) return;

    let activeIndex = stageController.getActiveIndex();
    let playing = false;

    function syncPlayButton() {
        if (!playPauseBtn) return;
        playPauseBtn.textContent = playing ? 'Pause Tour' : 'Start Auto-Tour';
        playPauseBtn.setAttribute('aria-pressed', String(playing));
    }

    function stopAutoTour() {
        if (!playing) return;
        playing = false;
        syncPlayButton();
    }

    function updateReadouts(index) {
        activeIndex = (index + 6) % 6;
        const active = stageController.getStageData(activeIndex);
        if (stageReadout) stageReadout.textContent = active.name;
        if (stateReadout) stateReadout.textContent = active.state;
        if (tempReadout) tempReadout.textContent = active.driver;
        referenceDiagram.dataset.stage = active.name.toLowerCase();
    }

    playPauseBtn?.addEventListener('click', () => {
        playing = !playing;
        syncPlayButton();
    });
    prevBtn?.addEventListener('click', () => {
        stopAutoTour();
        stageController.activate(activeIndex - 1, true);
    });
    nextBtn?.addEventListener('click', () => {
        stopAutoTour();
        stageController.activate(activeIndex + 1, true);
    });

    document.addEventListener('watercycle:stagechange', (event) => {
        if (event.detail.userTriggered) stopAutoTour();
        updateReadouts(event.detail.index);
    });

    updateReadouts(activeIndex);
    syncPlayButton();

    window.setInterval(() => {
        if (playing && !document.hidden) {
            stageController.activate(activeIndex + 1, false);
        }
    }, 5000);
}

/* ============================================================================
   WATER-CYCLE WEATHER LAB (Canvas 2D + LiquidEngine + CloudEngine)
   ============================================================================ */

function initSimulation() {
    const canvas = document.getElementById('simulation-canvas');
    const diagramStage = document.getElementById('wc-diagram-stage');
    const particleStage = document.getElementById('wc-particle-stage');
    if (!canvas || !diagramStage) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = {
        sun: 65,
        temperature: 24,
        humidity: 55,
        season: 'Summer',
        playing: !prefersReduced,
        trackDrop: true,
        mode: 'diagram'
    };

    const el = {
        sun: document.getElementById('sun-strength-slider'),
        temp: document.getElementById('temperature-slider'),
        humidity: document.getElementById('humidity-slider'),
        season: document.getElementById('season-selector'),
        sunValue: document.getElementById('sun-strength-value'),
        tempValue: document.getElementById('temperature-value'),
        humidityValue: document.getElementById('humidity-value'),
        toggle: document.getElementById('animate-btn'),
        trackBtn: document.getElementById('wc-track-drop'),
        reset: document.getElementById('reset-btn'),
        atmosphere: document.getElementById('metric-atmosphere'),
        dewpoint: document.getElementById('metric-dewpoint'),
        oceans: document.getElementById('metric-oceans'),
        underground: document.getElementById('metric-underground'),
        explanation: document.getElementById('weather-explanation'),
        comparison: document.getElementById('weather-comparison'),
        btnDiagram: document.getElementById('wc-mode-diagram'),
        btnParticle: document.getElementById('wc-mode-particle'),
        particleBadge: document.getElementById('wc-particle-badge')
    };

    const PRESETS = {
        dry: { sun: 80, temperature: 30, humidity: 25, season: 'Summer' },
        humid: { sun: 80, temperature: 30, humidity: 90, season: 'Summer' },
        storm: { sun: 35, temperature: 14, humidity: 92, season: 'Fall' },
        cold: { sun: 25, temperature: -5, humidity: 70, season: 'Winter' }
    };
    const presetButtons = Array.from(document.querySelectorAll('.wc-scenarios [data-weather]'));

    let simW = 760;
    let simH = 420;
    let simTime = 0;
    let saved = null;
    let wcCloudSim = null;
    let particleStageVisible = false;
    let stormFlash = 0;
    let lightningTimer = 3.5;

    const liquidLake = window.LiquidEngine?.createSurface({
        material: 'water',
        width: 260,
        restY: 0,
        columns: 52,
        maxColumns: 64
    });

    const precipDrops = Array.from({ length: 120 }, (_, i) => ({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1,
        depth: 0.5 + (i % 3) * 0.25,
        snow: false,
        sleet: false,
        phase: Math.random() * Math.PI * 2
    }));

    const splashes = Array.from({ length: 32 }, () => ({
        active: false,
        x: 0,
        y: 0,
        age: 0,
        life: 0.38,
        maxR: 9
    }));

    const fallLeaves = Array.from({ length: 10 }, (_, i) => ({
        xFrac: 0.39 + (i * 0.017) % 0.18,
        phase: i * 1.1,
        speed: 14 + (i % 4) * 4,
        hue: i % 2 === 0 ? '#d97706' : '#c2410c'
    }));

    // Deterministic seeded pebbles & sediment grains for zero-flicker subsurface geology
    const sedimentGrains = Array.from({ length: 85 }, (_, i) => {
        const s1 = Math.sin(i * 12.9898) * 43758.5453;
        const s2 = Math.sin(i * 78.233 + 1.5) * 43758.5453;
        const s3 = Math.sin(i * 39.425 + 4.1) * 43758.5453;
        return {
            u: 0.33 + (s1 - Math.floor(s1)) * 0.65,
            v: 0.725 + (s2 - Math.floor(s2)) * 0.23,
            r: 1.1 + (s3 - Math.floor(s3)) * 2.2,
            tone: i % 3 === 0 ? 'rgba(92, 72, 50, 0.35)' : i % 3 === 1 ? 'rgba(225, 205, 175, 0.35)' : 'rgba(65, 52, 38, 0.25)'
        };
    });

    const seepageDrops = Array.from({ length: 24 }, (_, i) => ({
        u: 0.38 + ((i * 0.137) % 0.38),
        progress: (i * 0.23) % 1,
        speed: 0.28 + (i % 4) * 0.06
    }));

    function makeMolecule(index) {
        const phases = ['evaporate', 'cloud', 'precipitate', 'runoff', 'infiltrate', 'transpire'];
        const startPhase = index === 0 ? 'evaporate' : phases[index % phases.length];
        return {
            index,
            phase: startPhase,
            t: (index * 0.13) % 1,
            lane: 0.18 + ((index * 0.37) % 0.72),
            x: 100,
            y: 250,
            tag: 'Evaporating',
            trail: []
        };
    }

    const molecules = Array.from({ length: 24 }, (_, idx) => makeMolecule(idx));

    function lerpRGB(c1, c2, t) {
        const k = Math.max(0, Math.min(1, t));
        return `rgb(${Math.round(c1[0] + (c2[0] - c1[0]) * k)}, ${Math.round(c1[1] + (c2[1] - c1[1]) * k)}, ${Math.round(c1[2] + (c2[2] - c1[2]) * k)})`;
    }

    function computeAtmosphere() {
        const T = state.temperature;
        const RH = Math.max(1, state.humidity);
        const a = 17.625;
        const b = 243.04;
        const gamma = Math.log(RH / 100) + (a * T) / (b + T);
        const dewC = state.humidity <= 0 ? -40 : Math.round(((b * gamma) / (a - gamma)) * 10) / 10;
        const spreadC = Math.max(0, T - dewC);
        const lclMeters = Math.max(120, Math.round(125 * spreadC));
        const tendency = Math.round((0.25 + state.sun / 133) * (T + 15) / 55 * (1 - state.humidity / 100) * 100);
        const precipRate = state.humidity < 65 ? 0 : (state.humidity - 65) / 35;
        const precipKind = state.humidity < 65 ? 'none' : T <= 0 ? 'snow' : T <= 2 ? 'sleet' : 'rain';
        return { T, RH, dewC, spreadC, lclMeters, tendency, precipRate, precipKind };
    }

    function syncPresetHighlight() {
        presetButtons.forEach((btn) => {
            const p = PRESETS[btn.dataset.weather];
            const match = p &&
                p.sun === state.sun &&
                p.temperature === state.temperature &&
                p.humidity === state.humidity &&
                p.season === state.season;
            btn.classList.toggle('is-active', Boolean(match));
            btn.setAttribute('aria-pressed', String(Boolean(match)));
        });
    }

    function buildExplanation(atmo) {
        if (atmo.T <= 0 && atmo.precipRate > 0) {
            return 'Below 0°C, moisture condensing in cold clouds falls as snow instead of rain, and the lake surface freezes. Low temperatures keep evaporation very slow.';
        }
        if (atmo.T <= 0) {
            return 'Freezing air holds very little water vapor and caps evaporation near the frozen lake surface. With strong sun and dry air, ice can still lose a trickle of vapor by sublimation.';
        }
        if (state.humidity >= 85) {
            return `At ${state.humidity}% relative humidity, the air is nearly saturated and the dew point (${atmo.dewC}°C) sits close to air temperature — forming low clouds around ${atmo.lclMeters.toLocaleString()} m while slowing net evaporation.`;
        }
        if (state.humidity <= 35 && state.sun >= 60) {
            return `Warm, dry air (${state.humidity}% humidity) and strong sunlight (${state.sun}%) create a steep moisture gradient, driving rapid evaporation and transpiration while keeping cloud bases high (~${atmo.lclMeters.toLocaleString()} m).`;
        }
        if (state.sun <= 25) {
            return `Weak solar energy (${state.sun}%) slows heating at the ocean and leaves, reducing evaporation even when air is fairly dry. Clouds form near ${atmo.lclMeters.toLocaleString()} m if air rises and cools.`;
        }
        return `Under moderate conditions, solar heating lifts vapor from the ocean and forest until rising air cools to ${atmo.dewC}°C (cloud base ~${atmo.lclMeters.toLocaleString()} m). Keep sun and temperature fixed and change humidity alone to compare.`;
    }

    function updateReadouts() {
        const atmo = computeAtmosphere();
        if (el.sunValue) el.sunValue.textContent = state.sun;
        if (el.tempValue) el.tempValue.textContent = state.temperature;
        if (el.humidityValue) el.humidityValue.textContent = state.humidity;

        if (el.atmosphere) {
            el.atmosphere.textContent = `${atmo.tendency < 20 ? 'Low' : atmo.tendency < 50 ? 'Moderate' : 'High'} · ${atmo.tendency}/100`;
        }
        if (el.dewpoint) {
            el.dewpoint.textContent = `Dew ${atmo.dewC}°C · Base ~${atmo.lclMeters.toLocaleString()} m`;
        }
        if (el.oceans) {
            el.oceans.textContent = state.humidity >= 90 ? 'Nearly saturated' : state.humidity >= 60 ? 'Humid air' : 'Drier air';
        }
        if (el.underground) {
            if (atmo.precipKind === 'snow') el.underground.textContent = 'Snowfall (frozen)';
            else if (atmo.precipKind === 'sleet') el.underground.textContent = 'Wintry mix / sleet';
            else if (atmo.precipRate > 0.55) el.underground.textContent = 'Heavy rain showers';
            else if (atmo.precipRate > 0) el.underground.textContent = 'Light rain showers';
            else if (atmo.T <= 0) el.underground.textContent = 'Freezing · light ice';
            else if (state.humidity >= 48) el.underground.textContent = 'Fair-weather cumulus';
            else el.underground.textContent = 'Mostly clear sky';
        }
        if (el.explanation) {
            el.explanation.textContent = buildExplanation(atmo);
        }
        document.getElementById('wc-current-meter').value = atmo.tendency;
        document.getElementById('wc-current-score').textContent = atmo.tendency + '/100';
        const baselineMeter = document.getElementById('wc-baseline-meter');
        baselineMeter.hidden = !saved;
        baselineMeter.value = saved?.index ?? 0;
        document.getElementById('wc-baseline-score').textContent = saved ? saved.index + '/100' : 'Unsaved';
        if (saved && el.comparison) {
            const variables = { sun: 'sunlight', temperature: 'temperature', humidity: 'humidity', season: 'season' };
            const changed = Object.keys(variables).filter(key => state[key] !== saved[key]);
            let guidance = 'Change one condition to test its effect.';
            if (changed.length === 1) guidance = 'You isolated ' + variables[changed[0]] + '.';
            if (changed.length > 1) guidance = 'You changed ' + changed.map(key => variables[key]).join(', ') + '. Restore all but one to isolate its effect.';
            const change = atmo.tendency - saved.index;
            el.comparison.textContent = `Baseline: ${saved.season}, ${saved.sun}% sun, ${saved.temperature}°C, ${saved.humidity}% humidity → ${saved.index}/100. Current tendency is ${change === 0 ? 'unchanged' : `${Math.abs(change)} points ${change > 0 ? 'higher' : 'lower'}`}. ${guidance}`;
        }
        syncPresetHighlight();
    }

    function syncCloudSim() {
        const atmo = computeAtmosphere();
        if (el.particleBadge) {
            const precipLabel = atmo.precipKind === 'none' ? 'Dry air (no rain)' : atmo.precipKind === 'snow' ? 'Snowfall active' : atmo.precipKind === 'sleet' ? 'Wintry mix active' : 'Rainfall active';
            el.particleBadge.textContent = `LCL ~${atmo.lclMeters.toLocaleString()} m (${Math.round(atmo.lclMeters * 3.28084).toLocaleString()} ft) · ${precipLabel} · Click/drag sky or ocean to launch a thermal updraft.`;
        }
        if (!wcCloudSim) return;
        const tempF = Math.round(state.temperature * 1.8 + 32);
        const dewF = Math.round(atmo.dewC * 1.8 + 32);
        wcCloudSim.setThermodynamics({ tempF, dewPointF: dewF });
        wcCloudSim.setTurbulence(0.35 + (state.sun / 100) * 0.95);
        wcCloudSim.setAtmosphere?.({
            sunStrength: state.sun / 100,
            humidity: state.humidity,
            precipRate: atmo.precipRate,
            precipKind: atmo.precipKind,
            evapScale: 0.35 + (atmo.tendency / 100) * 1.4,
            season: state.season
        });
    }

    let diagramReady = false;
    const canvasHelper = window.SimKit?.canvas2d(canvas, {
        box: diagramStage,
        onResize: (_, w, h) => {
            simW = w;
            simH = h;
            liquidLake?.configure(w * 0.34, 0, 52);
            if (diagramReady && state.mode === 'diagram') renderDiagram();
        }
    });
    const ctx = canvasHelper?.ctx || canvas.getContext('2d');
    diagramReady = true;

    // Interactive ocean ripples when clicking/dragging on the water surface
    let pointerDown = false;
    function triggerOceanRipple(clientX, clientY) {
        if (!liquidLake) return;
        const rect = canvas.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;
        if (px <= simW * 0.35 && py >= simH * 0.56) {
            liquidLake.impulse(px, -16, 22);
        }
    }
    canvas.addEventListener('pointerdown', (e) => {
        pointerDown = true;
        triggerOceanRipple(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointermove', (e) => {
        if (pointerDown) triggerOceanRipple(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', () => { pointerDown = false; });

    function terrainY(x, w, h) {
        const u = x / w;
        if (u <= 0.32) return 0.70 * h;
        if (u <= 0.62) {
            const k = (u - 0.32) / 0.30;
            return (0.69 - Math.sin(k * Math.PI) * 0.032) * h;
        }
        if (u <= 0.80) {
            const k = (u - 0.62) / 0.18;
            return (0.68 - Math.pow(k, 1.25) * 0.38) * h;
        }
        const k = (u - 0.80) / 0.20;
        return (0.30 + k * 0.25) * h;
    }

    function riverPoint(t, w, h) {
        const x = (0.79 - t * 0.47) * w;
        const baseY = terrainY(x, w, h);
        return { x, y: baseY + Math.sin(t * Math.PI * 2.5) * 2.6 };
    }

    function spawnSplash(x, y, maxR = 8) {
        for (let i = 0; i < splashes.length; i++) {
            const s = splashes[i];
            if (!s.active) {
                s.active = true;
                s.x = x;
                s.y = y;
                s.age = 0;
                s.life = 0.34;
                s.maxR = maxR;
                break;
            }
        }
    }

    function stepParticles(dt, atmo) {
        const w = simW;
        const h = simH;
        const waterY = 0.70 * h;
        const lclNorm = Math.min(1, Math.max(0, (atmo.lclMeters - 120) / 2600));
        const lclY = (0.42 - lclNorm * 0.23) * h;

        // Occasional storm lightning
        if (state.humidity >= 88 && atmo.T > 8 && atmo.precipRate > 0.55) {
            if (stormFlash > 0) {
                stormFlash = Math.max(0, stormFlash - dt * 3.2);
            } else {
                lightningTimer -= dt;
                if (lightningTimer <= 0) {
                    stormFlash = 1.0;
                    lightningTimer = 4.5 + Math.random() * 6;
                }
            }
        } else {
            stormFlash = 0;
        }

        const spawnProb = atmo.precipRate > 0 ? dt * (14 + atmo.precipRate * 55) : 0;
        for (let n = 0; n < 3; n++) {
            if (Math.random() >= spawnProb) continue;
            for (let i = 0; i < precipDrops.length; i++) {
                const d = precipDrops[i];
                if (!d.active) {
                    d.active = true;
                    d.snow = atmo.precipKind === 'snow' || (atmo.precipKind === 'sleet' && i % 2 === 0);
                    d.sleet = atmo.precipKind === 'sleet' && !d.snow;
                    d.x = (0.34 + Math.random() * 0.45) * w;
                    d.y = lclY + 12 + Math.random() * 14;
                    d.vx = d.snow ? (Math.random() - 0.5) * 18 : -18 * d.depth;
                    d.vy = d.snow ? (38 + Math.random() * 26) * d.depth : (210 + Math.random() * 110) * d.depth;
                    d.size = d.snow ? (2.0 + Math.random() * 2.1) * d.depth : (8 + d.depth * 6);
                    break;
                }
            }
        }

        for (let i = 0; i < precipDrops.length; i++) {
            const d = precipDrops[i];
            if (!d.active) continue;
            d.x += (d.vx + (d.snow ? Math.sin(simTime * 2.5 + d.phase) * 18 : 0)) * dt;
            d.y += d.vy * dt;
            const ground = Math.min(waterY, terrainY(d.x, w, h));
            if (d.y >= ground) {
                if (!d.snow && Math.random() < 0.35) {
                    spawnSplash(d.x, ground, d.x < 0.34 * w ? 9 : 6);
                    if (d.x < 0.33 * w && liquidLake && atmo.T > 0) {
                        liquidLake.impulse(d.x, -4.5, 10);
                    }
                }
                d.active = false;
            }
        }

        for (let i = 0; i < splashes.length; i++) {
            const s = splashes[i];
            if (!s.active) continue;
            s.age += dt;
            if (s.age >= s.life) s.active = false;
        }

        for (let i = 0; i < seepageDrops.length; i++) {
            const sp = seepageDrops[i];
            const infRate = atmo.T <= -3 ? 0.03 : 0.1 + atmo.precipRate * 0.45;
            sp.progress = (sp.progress + dt * sp.speed * infRate) % 1;
        }

        const speedScale = 0.12 + (atmo.tendency / 100) * 0.22 + atmo.precipRate * 0.14;
        for (let i = 0; i < molecules.length; i++) {
            const m = molecules[i];
            const rate = m.phase === 'groundwater' ? speedScale * 0.48 : m.phase === 'precipitate' ? speedScale * 1.45 : speedScale;
            m.t += dt * rate;
            if (m.t >= 1) {
                m.t = 0;
                if (m.phase === 'evaporate' || m.phase === 'transpire') {
                    m.phase = 'cloud';
                    m.tag = 'Condensing';
                } else if (m.phase === 'cloud') {
                    if (state.humidity >= 50) {
                        m.phase = 'precipitate';
                        m.tag = atmo.T <= 0 ? 'Snowing' : 'Raining';
                    } else {
                        m.phase = m.index % 3 === 0 ? 'transpire' : 'evaporate';
                        m.tag = m.phase === 'transpire' ? 'Transpiring' : 'Evaporating';
                    }
                } else if (m.phase === 'precipitate') {
                    const roll = (m.index * 0.31 + simTime * 0.17) % 1;
                    if (roll < 0.48) {
                        m.phase = 'runoff';
                        m.tag = 'Runoff';
                    } else if (roll < 0.82) {
                        m.phase = 'infiltrate';
                        m.tag = 'Infiltrating';
                    } else {
                        m.phase = 'transpire';
                        m.tag = 'Transpiring';
                    }
                } else if (m.phase === 'runoff') {
                    m.phase = 'evaporate';
                    m.tag = atmo.T <= 0 ? 'Sublimating' : 'Evaporating';
                } else if (m.phase === 'infiltrate') {
                    m.phase = 'groundwater';
                    m.tag = 'Groundwater';
                } else if (m.phase === 'groundwater') {
                    m.phase = 'evaporate';
                    m.tag = atmo.T <= 0 ? 'Sublimating' : 'Evaporating';
                }
            }

            if (m.phase === 'evaporate') {
                const startX = (0.06 + m.lane * 0.22) * w;
                const endX = (0.37 + m.lane * 0.16) * w;
                m.x = startX + (endX - startX) * m.t + Math.sin(m.t * Math.PI * 3 + m.index) * 8;
                m.y = waterY - (waterY - lclY) * m.t;
                m.tag = atmo.T <= 0 ? 'Sublimating' : 'Evaporating';
            } else if (m.phase === 'transpire') {
                const treeX = (0.41 + m.lane * 0.12) * w;
                const startY = 0.56 * h;
                m.x = treeX + Math.sin(m.t * Math.PI * 2 + m.index) * 10;
                m.y = startY - (startY - lclY) * m.t;
                m.tag = 'Transpiring';
            } else if (m.phase === 'cloud') {
                m.x = (0.37 + m.t * 0.38) * w;
                m.y = lclY - 10 + Math.sin(m.t * Math.PI * 2 + m.index) * 8;
                m.tag = 'Condensing';
            } else if (m.phase === 'precipitate') {
                const dropX = (0.44 + m.lane * 0.34) * w;
                const landY = terrainY(dropX, w, h);
                m.x = dropX - m.t * 14 + (atmo.T <= 0 ? Math.sin(m.t * 10 + m.index) * 8 : 0);
                m.y = (lclY + 10) + (landY - lclY - 10) * m.t;
                m.tag = atmo.T <= 0 ? 'Snowing' : 'Raining';
            } else if (m.phase === 'runoff') {
                const pt = riverPoint(m.t, w, h);
                m.x = pt.x;
                m.y = pt.y;
                m.tag = 'Runoff';
            } else if (m.phase === 'infiltrate') {
                const infX = (0.45 + m.lane * 0.25) * w;
                const topY = terrainY(infX, w, h) + 4;
                const botY = 0.87 * h;
                m.x = infX;
                m.y = topY + (botY - topY) * m.t;
                m.tag = 'Infiltrating';
            } else if (m.phase === 'groundwater') {
                const startX = (0.50 + m.lane * 0.22) * w;
                const endX = 0.31 * w;
                m.x = startX + (endX - startX) * m.t;
                m.y = (0.86 + Math.sin(m.t * Math.PI) * 0.02) * h;
                m.tag = 'Groundwater';
            }

            if (i === 0) {
                m.trail.push({ x: m.x, y: m.y });
                if (m.trail.length > 16) m.trail.shift();
            }
        }
    }

    function drawTree(x, groundY, scale, season, temp, sunStrength) {
        const sway = Math.sin(simTime * 1.4 + x * 0.04) * (1.5 + sunStrength * 1.2) * scale;
        const trunkH = 26 * scale;

        // Subtle root tendrils extending into topsoil
        ctx.save();
        ctx.strokeStyle = 'rgba(72, 48, 28, 0.55)';
        ctx.lineWidth = 1.6 * scale;
        ctx.beginPath();
        ctx.moveTo(x - 2 * scale, groundY + 1);
        ctx.quadraticCurveTo(x - 10 * scale, groundY + 10 * scale, x - 16 * scale, groundY + 18 * scale);
        ctx.moveTo(x + 2 * scale, groundY + 1);
        ctx.quadraticCurveTo(x + 9 * scale, groundY + 12 * scale, x + 15 * scale, groundY + 19 * scale);
        ctx.stroke();

        // Tapered trunk
        ctx.fillStyle = '#5c4028';
        ctx.beginPath();
        ctx.moveTo(x - 4 * scale, groundY + 2);
        ctx.lineTo(x - 2.2 * scale + sway * 0.35, groundY - trunkH);
        ctx.lineTo(x + 2.2 * scale + sway * 0.35, groundY - trunkH);
        ctx.lineTo(x + 4 * scale, groundY + 2);
        ctx.closePath();
        ctx.fill();

        if (season === 'Winter') {
            ctx.strokeStyle = '#5c4028';
            ctx.lineWidth = 2.1 * scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + sway * 0.25, groundY - trunkH * 0.7);
            ctx.lineTo(x - 14 * scale + sway * 0.65, groundY - trunkH * 1.25);
            ctx.moveTo(x + sway * 0.28, groundY - trunkH * 0.75);
            ctx.lineTo(x + 13 * scale + sway * 0.65, groundY - trunkH * 1.2);
            ctx.moveTo(x + sway * 0.35, groundY - trunkH);
            ctx.lineTo(x - 3 * scale + sway * 0.85, groundY - trunkH * 1.48);
            ctx.stroke();
            if (temp <= 2) {
                ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
                ctx.beginPath();
                ctx.ellipse(x - 10 * scale + sway * 0.6, groundY - trunkH * 1.23, 6.5 * scale, 2.4 * scale, -0.3, 0, Math.PI * 2);
                ctx.ellipse(x + 9 * scale + sway * 0.6, groundY - trunkH * 1.19, 6.5 * scale, 2.4 * scale, 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            return;
        }

        const palettes = {
            Spring: ['#389a56', '#56be74', '#86e09c'],
            Summer: ['#1c6438', '#2a844b', '#44aa68'],
            Fall: ['#a14315', '#d97706', '#f59e0b']
        };
        const [shadowCol, midCol, lightCol] = palettes[season] || palettes.Summer;
        const cx = x + sway * 0.85;
        const cy = groundY - trunkH - 16 * scale;

        const lobes = [
            [-11, 4, 13, 14, shadowCol],
            [11, 5, 13, 14, shadowCol],
            [0, -4, 17, 19, midCol],
            [-7, -11, 11, 12, lightCol],
            [7, -9, 10, 11, lightCol]
        ];
        lobes.forEach(([ox, oy, rx, ry, col]) => {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.ellipse(cx + ox * scale, cy + oy * scale, rx * scale, ry * scale, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        if (season === 'Spring') {
            ctx.fillStyle = '#fde2e4';
            [[-10, -4], [7, -14], [-3, -18], [10, 2], [-14, 5]].forEach(([dx, dy]) => {
                ctx.beginPath();
                ctx.arc(cx + dx * scale, cy + dy * scale, 2.2 * scale, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        ctx.restore();
    }

    function drawCloudBank(w, h, lclY, atmo) {
        if (state.humidity < 15) return;
        const cloudDensity = Math.min(1, (state.humidity - 15) / 85);
        const cx = 0.56 * w;
        const spread = (0.19 + cloudDensity * 0.23) * w;
        const cloudH = (42 + cloudDensity * 52);

        // Soft virga / rain-curtain atmospheric haze beneath precipitating clouds
        if (atmo.precipRate > 0) {
            const curtainGrad = ctx.createLinearGradient(0, lclY + 6, 0, 0.68 * h);
            curtainGrad.addColorStop(0, `rgba(92, 124, 152, ${0.18 + atmo.precipRate * 0.25})`);
            curtainGrad.addColorStop(1, 'rgba(92, 124, 152, 0)');
            ctx.fillStyle = curtainGrad;
            ctx.beginPath();
            ctx.moveTo(cx - spread * 0.72, lclY + 10);
            ctx.lineTo(cx + spread * 0.72, lclY + 10);
            ctx.lineTo(cx + spread * 0.58, 0.68 * h);
            ctx.lineTo(cx - spread * 0.85, 0.68 * h);
            ctx.closePath();
            ctx.fill();
        }

        // Volumetric 3D cloud bank via CloudEngine
        if (window.CloudEngine?.renderCloudCluster) {
            const isStorm = atmo.precipRate > 0.32;
            const isGolden = state.temperature >= 29 && state.humidity < 50;
            window.CloudEngine.renderCloudCluster(ctx, cx, lclY - cloudH * 0.28, spread * 1.4, cloudH, {
                storm: isStorm,
                golden: isGolden,
                darkBase: true,
                opacity: 0.45 + cloudDensity * 0.55,
                time: simTime
            });

            // Secondary drifting cumulus puff over coastal foothills
            const driftX = ((0.35 + (simTime * 0.008) % 0.12) * w);
            window.CloudEngine.renderCloudCluster(ctx, driftX, lclY - cloudH * 0.18, spread * 0.65, cloudH * 0.62, {
                storm: isStorm,
                golden: isGolden,
                darkBase: cloudDensity > 0.4,
                opacity: (0.28 + cloudDensity * 0.45),
                time: simTime + 3.1
            });
        } else {
            ctx.fillStyle = 'rgba(245, 250, 255, 0.85)';
            ctx.beginPath();
            ctx.ellipse(cx, lclY - 12, spread * 0.7, 26, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Internal storm lightning glow inside cloud core
        if (stormFlash > 0.05) {
            const flashGrad = ctx.createRadialGradient(cx, lclY - cloudH * 0.3, 4, cx, lclY - cloudH * 0.3, spread * 0.55);
            flashGrad.addColorStop(0, `rgba(255, 252, 224, ${stormFlash * 0.85})`);
            flashGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
            ctx.fillStyle = flashGrad;
            ctx.beginPath();
            ctx.arc(cx, lclY - cloudH * 0.3, spread * 0.55, 0, Math.PI * 2);
            ctx.fill();
        }

        // LCL dashed guide line
        ctx.save();
        ctx.strokeStyle = 'rgba(14, 74, 110, 0.48)';
        ctx.lineWidth = 1.25;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0.32 * w, lclY + 10);
        ctx.lineTo(0.84 * w, lclY + 10);
        ctx.stroke();
        ctx.restore();
        drawLabel(`Cloud base (LCL) ~${atmo.lclMeters.toLocaleString()} m`, 14, Math.max(22, lclY + 14));
    }

    function drawLabel(text, x, y, align = 'left') {
        ctx.save();
        ctx.font = '700 11.5px system-ui, sans-serif';
        ctx.textAlign = align;
        const padX = 7;
        const tw = ctx.measureText(text).width;
        const bx = align === 'center' ? x - tw / 2 - padX : align === 'right' ? x - tw - padX : x - padX;
        ctx.fillStyle = 'rgba(248, 252, 255, 0.82)';
        ctx.strokeStyle = 'rgba(15, 53, 72, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, y - 13, tw + padX * 2, 18, 9);
        else ctx.rect(bx, y - 13, tw + padX * 2, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f3548';
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    function renderDiagram() {
        const w = simW;
        const h = simH;
        const atmo = computeAtmosphere();
        const waterY = 0.70 * h;
        const lclNorm = Math.min(1, Math.max(0, (atmo.lclMeters - 120) / 2600));
        const lclY = (0.42 - lclNorm * 0.23) * h;
        const sunStrength = state.sun / 100;

        ctx.clearRect(0, 0, w, h);

        // 1. Continuous Smooth RGB Sky Gradient
        const warmMix = Math.max(0, Math.min(1, (atmo.T - 4) / 30));
        const coldMix = Math.max(0, Math.min(1, (4 - atmo.T) / 14));
        const stormMix = Math.min(1, atmo.precipRate * 1.15);

        let topBase = [64, 158, 224];
        let botBase = [214, 242, 255];
        if (coldMix > 0) {
            topBase = [64 + 45 * coldMix, 158 + 20 * coldMix, 224 - 12 * coldMix];
            botBase = [214 + 22 * coldMix, 242, 255];
        } else if (warmMix > 0.5) {
            const k = (warmMix - 0.5) * 2;
            botBase = [214 + 40 * k, 242 - 14 * k, 255 - 56 * k];
        }
        const topSky = lerpRGB(topBase, [78, 102, 124], stormMix);
        const botSky = lerpRGB(botBase, [182, 202, 218], stormMix);

        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.74);
        sky.addColorStop(0, topSky);
        sky.addColorStop(1, botSky);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Subtle high-altitude cirrus wisps in fair/moderate weather
        const cirrusSpr = window.CloudEngine?.getSprite?.('cirrus');
        if (cirrusSpr && state.humidity >= 18 && state.humidity <= 78 && atmo.precipRate < 0.25) {
            ctx.save();
            ctx.globalAlpha = 0.34 * (1 - atmo.precipRate * 2);
            const cx1 = ((0.18 + (simTime * 0.006) % 0.8) * w);
            const cx2 = ((0.58 + (simTime * 0.005) % 0.8) * w) % (w + 100) - 50;
            ctx.drawImage(cirrusSpr, cx1, 0.07 * h, 140, 46);
            ctx.drawImage(cirrusSpr, cx2, 0.12 * h, 120, 38);
            ctx.restore();
        }

        // 2. Multi-layered Sun + Volumetric God-Ray Shafts
        const sunAltMap = { Summer: 0.12, Spring: 0.15, Fall: 0.18, Winter: 0.22 };
        const sunX = 0.90 * w;
        const sunY = (sunAltMap[state.season] || 0.15) * h;
        const sunColors = { Summer: '#ffd54f', Spring: '#ffe066', Fall: '#ffb74d', Winter: '#fff0a6' };

        if (sunStrength > 0.06) {
            const dim = 1 - atmo.precipRate * 0.72;
            const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 44 + sunStrength * 74);
            halo.addColorStop(0, `rgba(255, 245, 185, ${0.72 * sunStrength * dim})`);
            halo.addColorStop(0.35, `rgba(255, 218, 92, ${0.34 * sunStrength * dim})`);
            halo.addColorStop(1, 'rgba(255, 218, 92, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 44 + sunStrength * 74, 0, Math.PI * 2);
            ctx.fill();

            // Volumetric translucent solar shafts toward ocean & valley
            ctx.save();
            const shafts = [
                [0.08, 0.22],
                [0.24, 0.38],
                [0.44, 0.56]
            ];
            shafts.forEach(([leftFrac, rightFrac]) => {
                const shaftGrad = ctx.createLinearGradient(sunX, sunY, ((leftFrac + rightFrac) / 2) * w, waterY);
                shaftGrad.addColorStop(0, `rgba(255, 238, 168, ${0.14 * sunStrength * dim})`);
                shaftGrad.addColorStop(1, 'rgba(255, 238, 168, 0)');
                ctx.fillStyle = shaftGrad;
                ctx.beginPath();
                ctx.moveTo(sunX - 18, sunY + 12);
                ctx.lineTo(leftFrac * w, waterY);
                ctx.lineTo(rightFrac * w, waterY);
                ctx.closePath();
                ctx.fill();
            });
            ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = sunColors[state.season] || '#ffd54f';
        ctx.globalAlpha = 0.35 + sunStrength * 0.65;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 20 + sunStrength * 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 253, 235, ${0.55 * sunStrength})`;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 12 + sunStrength * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3. Atmospheric-Perspective Distant Mountain Ranges
        ctx.fillStyle = atmo.T <= 0 ? 'rgba(138, 174, 198, 0.42)' : 'rgba(116, 158, 182, 0.34)';
        ctx.beginPath();
        ctx.moveTo(0.32 * w, 0.71 * h);
        ctx.lineTo(0.49 * w, 0.49 * h);
        ctx.lineTo(0.61 * w, 0.57 * h);
        ctx.lineTo(0.75 * w, 0.38 * h);
        ctx.lineTo(0.88 * w, 0.48 * h);
        ctx.lineTo(w, 0.36 * h);
        ctx.lineTo(w, 0.72 * h);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = atmo.T <= 0 ? 'rgba(115, 146, 168, 0.52)' : 'rgba(98, 134, 152, 0.44)';
        ctx.beginPath();
        ctx.moveTo(0.38 * w, 0.71 * h);
        ctx.lineTo(0.56 * w, 0.53 * h);
        ctx.lineTo(0.68 * w, 0.43 * h);
        ctx.lineTo(0.80 * w, 0.52 * h);
        ctx.lineTo(w, 0.42 * h);
        ctx.lineTo(w, 0.72 * h);
        ctx.closePath();
        ctx.fill();

        // Fair-weather seabirds gliding gracefully
        if (atmo.precipRate < 0.15 && atmo.T > 2) {
            ctx.save();
            ctx.strokeStyle = 'rgba(20, 52, 74, 0.55)';
            ctx.lineWidth = 1.4;
            [[0.16, 0.24, 0], [0.22, 0.28, 1.4], [0.28, 0.21, 2.7]].forEach(([bx, by, ph]) => {
                const birdX = ((bx * w + simTime * 11) % (w * 0.65)) + 0.04 * w;
                const birdY = by * h + Math.sin(simTime * 2.2 + ph) * 3;
                const flap = Math.sin(simTime * 5.2 + ph) * 2.5;
                ctx.beginPath();
                ctx.moveTo(birdX - 6, birdY - flap);
                ctx.quadraticCurveTo(birdX - 3, birdY - 3, birdX, birdY);
                ctx.quadraticCurveTo(birdX + 3, birdY - 3, birdX + 6, birdY - flap);
                ctx.stroke();
            });
            ctx.restore();
        }

        // 4. Main Coastal Mountain & Faceted Rock Shading
        const mtnGrad = ctx.createLinearGradient(0.62 * w, 0.30 * h, w, 0.72 * h);
        if (atmo.T <= 0) {
            mtnGrad.addColorStop(0, '#7c8e9c');
            mtnGrad.addColorStop(1, '#9fb0bd');
        } else {
            mtnGrad.addColorStop(0, '#6d5b49');
            mtnGrad.addColorStop(0.55, '#8c745c');
            mtnGrad.addColorStop(1, '#a58a6d');
        }
        ctx.fillStyle = mtnGrad;
        ctx.beginPath();
        ctx.moveTo(0.32 * w, h);
        ctx.lineTo(0.32 * w, terrainY(0.32 * w, w, h));
        for (let px = 0.33 * w; px <= w + 6; px += 6) {
            ctx.lineTo(Math.min(w, px), terrainY(Math.min(w, px), w, h));
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // Mountain shaded western ridge facet
        ctx.save();
        ctx.fillStyle = 'rgba(24, 34, 48, 0.16)';
        ctx.beginPath();
        ctx.moveTo(0.62 * w, terrainY(0.62 * w, w, h));
        for (let px = 0.62 * w; px <= 0.80 * w; px += 6) {
            ctx.lineTo(px, terrainY(px, w, h));
        }
        ctx.lineTo(0.79 * w, 0.71 * h);
        ctx.lineTo(0.62 * w, 0.71 * h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Dynamic jagged mountain snowpack (descends below 10°C)
        const snowFrac = Math.max(0.14, Math.min(0.95, (10 - atmo.T) / 16));
        const snowLineY = (0.29 + snowFrac * 0.38) * h;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0.62 * w, terrainY(0.62 * w, w, h));
        for (let px = 0.63 * w; px <= w + 6; px += 6) {
            ctx.lineTo(Math.min(w, px), terrainY(Math.min(w, px), w, h));
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0.62 * w, h);
        ctx.closePath();
        ctx.clip();

        ctx.fillStyle = '#f2f8fc';
        ctx.beginPath();
        ctx.moveTo(0.60 * w, 0.24 * h);
        ctx.lineTo(w + 10, 0.24 * h);
        ctx.lineTo(w + 10, snowLineY + 6);
        for (let px = w; px >= 0.60 * w; px -= 12) {
            const jag = Math.sin(px * 0.14) * 5 + Math.cos(px * 0.08) * 3;
            ctx.lineTo(px, snowLineY + jag);
        }
        ctx.closePath();
        ctx.fill();

        // Subtle cool shadow on left slope of snowpack
        ctx.fillStyle = 'rgba(148, 192, 224, 0.32)';
        ctx.fillRect(0.60 * w, 0.24 * h, 0.195 * w, snowLineY - 0.20 * h);
        ctx.restore();

        // Coastal beach & grassy valley turf
        ctx.fillStyle = '#d6be96';
        ctx.beginPath();
        ctx.ellipse(0.325 * w, 0.702 * h, 18, 6, -0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = atmo.T <= 0 ? '#eef6fb' : state.season === 'Fall' ? '#95913c' : state.season === 'Spring' ? '#58a852' : '#3d8643';
        ctx.lineWidth = 7.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let px = 0.33 * w; px <= 0.67 * w; px += 6) {
            const py = terrainY(px, w, h);
            if (px === 0.33 * w) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Spring wildflowers or lush grass tufts
        if (atmo.T > 2) {
            ctx.save();
            for (let gx = 0.36 * w; gx <= 0.63 * w; gx += 18) {
                const gy = terrainY(gx, w, h) - 3;
                const sway = Math.sin(simTime * 1.8 + gx * 0.1) * 1.8;
                ctx.strokeStyle = state.season === 'Fall' ? '#8c7e2c' : '#35783a';
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(gx, gy + 2);
                ctx.lineTo(gx + sway, gy - 5);
                ctx.stroke();
                if (state.season === 'Spring' && Math.round(gx) % 36 < 18) {
                    ctx.fillStyle = '#fef08a';
                    ctx.beginPath();
                    ctx.arc(gx + sway, gy - 5, 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // Subsurface Geological Cross-Section:
        // 4a. Dark organic topsoil band
        ctx.fillStyle = '#5c4632';
        ctx.beginPath();
        ctx.moveTo(0.32 * w, 0.705 * h);
        for (let px = 0.33 * w; px <= w + 6; px += 12) {
            ctx.lineTo(Math.min(w, px), terrainY(Math.min(w, px), w, h) + 5);
        }
        ctx.lineTo(w, 0.74 * h);
        ctx.lineTo(0.32 * w, 0.74 * h);
        ctx.closePath();
        ctx.fill();

        // 4b. Porous vadose soil & sandstone layer
        const soilGrad = ctx.createLinearGradient(0, 0.72 * h, 0, 0.96 * h);
        soilGrad.addColorStop(0, '#b99b72');
        soilGrad.addColorStop(0.65, '#9d7f59');
        soilGrad.addColorStop(1, '#786147');
        ctx.fillStyle = soilGrad;
        ctx.beginPath();
        ctx.moveTo(0.32 * w, 0.73 * h);
        ctx.lineTo(w, 0.73 * h);
        ctx.lineTo(w, h);
        ctx.lineTo(0.32 * w, h);
        ctx.closePath();
        ctx.fill();

        // Seeded pebbles & porous sediment texture
        for (let i = 0; i < sedimentGrains.length; i++) {
            const g = sedimentGrains[i];
            ctx.fillStyle = g.tone;
            ctx.beginPath();
            ctx.arc(g.u * w, g.v * h, g.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Animated infiltration seepage trickles from rain/snowmelt
        if (atmo.precipRate > 0.05 || atmo.T > 2) {
            ctx.save();
            const alpha = atmo.precipRate > 0 ? 0.42 + atmo.precipRate * 0.45 : 0.22;
            ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
            for (let i = 0; i < seepageDrops.length; i++) {
                const sp = seepageDrops[i];
                const sx = sp.u * w + Math.sin(sp.progress * Math.PI * 4 + i) * 3;
                const topY = terrainY(sx, w, h) + 8;
                const sy = topY + (0.85 * h - topY) * sp.progress;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 4c. Deep Groundwater Aquifer + animated subterranean flow streamlines
        const aqLift = (state.humidity / 100) * 0.03 * h;
        const aqTop = 0.84 * h - aqLift;
        const aqGrad = ctx.createLinearGradient(0, aqTop, 0, 0.955 * h);
        aqGrad.addColorStop(0, 'rgba(56, 168, 238, 0.80)');
        aqGrad.addColorStop(1, 'rgba(16, 76, 128, 0.94)');
        ctx.fillStyle = aqGrad;
        ctx.beginPath();
        ctx.moveTo(0.31 * w, waterY + 12);
        ctx.quadraticCurveTo(0.55 * w, aqTop, 0.96 * w, aqTop - 8);
        ctx.lineTo(0.96 * w, 0.955 * h);
        ctx.lineTo(0.31 * w, 0.955 * h);
        ctx.closePath();
        ctx.fill();

        // Shimmering water-table rim + flow lines discharging toward coast
        ctx.save();
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0.31 * w, waterY + 12);
        ctx.quadraticCurveTo(0.55 * w, aqTop, 0.96 * w, aqTop - 8);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(224, 247, 255, 0.35)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([8, 12]);
        ctx.lineDashOffset = simTime * 16;
        [0.885, 0.92].forEach((yFrac) => {
            ctx.beginPath();
            ctx.moveTo(0.92 * w, yFrac * h);
            ctx.quadraticCurveTo(0.62 * w, yFrac * h + 3, 0.32 * w, (yFrac - 0.04) * h);
            ctx.stroke();
        });
        ctx.restore();

        // 4d. Dark fractured impermeable bedrock base
        ctx.fillStyle = '#3c3b42';
        ctx.fillRect(0.315 * w, 0.955 * h, 0.685 * w, 0.045 * h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        for (let bx = 0.34 * w; bx < w; bx += 42) {
            ctx.beginPath();
            ctx.moveTo(bx, 0.955 * h);
            ctx.lineTo(bx - 12, h);
            ctx.stroke();
        }

        // Mountain River + Whitewater Shimmer + Delta Plume
        ctx.save();
        ctx.strokeStyle = 'rgba(60, 44, 28, 0.38)';
        ctx.lineWidth = 8.5 + atmo.precipRate * 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= 26; i++) {
            const pt = riverPoint(i / 26, w, h);
            if (i === 0) ctx.moveTo(pt.x, pt.y + 1.5);
            else ctx.lineTo(pt.x, pt.y + 1.5);
        }
        ctx.stroke();

        ctx.strokeStyle = atmo.T <= -4 ? '#bde3f7' : '#2a9cf2';
        ctx.lineWidth = 5 + atmo.precipRate * 3.5;
        ctx.beginPath();
        for (let i = 0; i <= 26; i++) {
            const pt = riverPoint(i / 26, w, h);
            if (i === 0) ctx.moveTo(pt.x, pt.y + 1);
            else ctx.lineTo(pt.x, pt.y + 1);
        }
        ctx.stroke();

        if (atmo.T > -4) {
            ctx.strokeStyle = 'rgba(224, 247, 255, 0.68)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([6, 12]);
            ctx.lineDashOffset = -simTime * (28 + atmo.precipRate * 24);
            ctx.beginPath();
            for (let i = 0; i <= 26; i++) {
                const pt = riverPoint(i / 26, w, h);
                if (i === 0) ctx.moveTo(pt.x, pt.y + 0.5);
                else ctx.lineTo(pt.x, pt.y + 0.5);
            }
            ctx.stroke();
        }
        ctx.restore();

        // 5. Lifelike Ocean / Lake: Sloped Seabed, Caustics, Waves, Glints & Sea Ice
        // 5a. Seabed visible in shallow coastal margin
        ctx.fillStyle = '#9a8466';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, 0.94 * h);
        ctx.quadraticCurveTo(0.24 * w, 0.89 * h, 0.34 * w, waterY + 2);
        ctx.lineTo(0.34 * w, h);
        ctx.closePath();
        ctx.fill();

        const lakeGrad = ctx.createLinearGradient(0, waterY, 0, h);
        lakeGrad.addColorStop(0, atmo.T <= 0 ? 'rgba(56, 152, 198, 0.88)' : 'rgba(56, 189, 228, 0.86)');
        lakeGrad.addColorStop(0.45, 'rgba(18, 114, 168, 0.92)');
        lakeGrad.addColorStop(1, 'rgba(12, 62, 98, 0.97)');
        ctx.fillStyle = lakeGrad;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, waterY);
        const waveScale = atmo.T <= 0 ? 0.14 : 1;
        if (liquidLake) {
            liquidLake.columns.forEach((col, idx) => {
                const lx = (idx / (liquidLake.columns.length - 1)) * 0.34 * w;
                const ly = waterY + col.y * waveScale;
                ctx.lineTo(lx, ly);
            });
        } else {
            ctx.lineTo(0.34 * w, waterY);
        }
        ctx.lineTo(0.34 * w, h);
        ctx.closePath();
        ctx.fill();

        // 5b. Animated underwater sunlight caustics
        if (sunStrength > 0.12 && atmo.T > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, waterY + 4, 0.33 * w, h - waterY - 8);
            ctx.clip();
            const causticAlpha = 0.14 * sunStrength * (1 - atmo.precipRate * 0.65);
            ctx.strokeStyle = `rgba(186, 243, 255, ${causticAlpha})`;
            ctx.lineWidth = 1.6;
            for (let b = 0; b < 4; b++) {
                const cy = waterY + 18 + b * 22;
                ctx.beginPath();
                for (let cx = 4; cx < 0.32 * w; cx += 28) {
                    const wob = Math.sin(cx * 0.05 + simTime * 1.8 + b * 1.4) * 3.5;
                    ctx.moveTo(cx, cy + wob);
                    ctx.quadraticCurveTo(cx + 9, cy + wob - 3, cx + 18, cy + wob + 1);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // 5c. Surface ripple meniscus highlight + whitecap foam crests + sun glints
        ctx.strokeStyle = 'rgba(228, 250, 255, 0.82)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (liquidLake) {
            liquidLake.columns.forEach((col, idx) => {
                const lx = (idx / (liquidLake.columns.length - 1)) * 0.34 * w;
                const ly = waterY + col.y * waveScale;
                if (idx === 0) ctx.moveTo(lx, ly);
                else ctx.lineTo(lx, ly);
            });
            ctx.stroke();

            // Sunlit sparkles & whitecap foam on steeper wave crests
            if (atmo.T > 0) {
                for (let idx = 2; idx < liquidLake.columns.length - 2; idx++) {
                    const yC = liquidLake.columns[idx].y;
                    if (yC < liquidLake.columns[idx - 1].y - 0.55 && yC < liquidLake.columns[idx + 1].y - 0.55) {
                        const lx = (idx / (liquidLake.columns.length - 1)) * 0.34 * w;
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
                        ctx.lineWidth = 2.2;
                        ctx.beginPath();
                        ctx.moveTo(lx - 5, waterY + yC);
                        ctx.lineTo(lx + 5, waterY + yC);
                        ctx.stroke();
                    }
                }
            }
        } else {
            ctx.stroke();
        }

        // Sun glitter path on ocean surface
        if (sunStrength > 0.15 && atmo.T > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 248, 210, ${0.42 * sunStrength * (1 - atmo.precipRate * 0.6)})`;
            for (let g = 0; g < 6; g++) {
                const gx = (0.12 + 0.17 * ((Math.sin(simTime * 1.4 + g * 1.9) + 1) * 0.5)) * w;
                const gy = waterY + 4 + g * 7;
                ctx.fillRect(gx, gy, 10 - g * 0.8, 1.4);
            }
            ctx.restore();
        }

        // 5d. Crystalline Ice Crust when freezing (<= 0°C)
        if (atmo.T <= 0) {
            const iceThick = Math.min(15, 5 + Math.abs(atmo.T) * 1.0);
            ctx.fillStyle = 'rgba(224, 247, 255, 0.86)';
            ctx.fillRect(0, waterY - 2, 0.33 * w, iceThick);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, waterY - 2);
            ctx.lineTo(0.33 * w, waterY - 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(125, 200, 232, 0.65)';
            ctx.lineWidth = 1;
            for (let ix = 18; ix < 0.30 * w; ix += 36) {
                ctx.beginPath();
                ctx.moveTo(ix, waterY - 1);
                ctx.lineTo(ix + 10, waterY + iceThick - 3);
                ctx.lineTo(ix + 18, waterY + 2);
                ctx.stroke();
            }
        }

        // 5e. Delicate curling evaporation mist wisps above ocean
        if (atmo.tendency > 18 && atmo.T > 0) {
            ctx.save();
            const mistAlpha = Math.min(0.34, 0.08 + (atmo.tendency / 100) * 0.28);
            ctx.strokeStyle = `rgba(255, 255, 255, ${mistAlpha})`;
            ctx.lineWidth = 2.4;
            ctx.lineCap = 'round';
            for (let e = 0; e < 5; e++) {
                const ex = (0.06 + e * 0.06) * w;
                const rise = (simTime * 16 + e * 11) % 44;
                const ey = waterY - 6 - rise;
                ctx.globalAlpha = Math.max(0, 1 - rise / 44);
                ctx.beginPath();
                ctx.moveTo(ex, ey + 14);
                ctx.bezierCurveTo(
                    ex + Math.sin(simTime * 2 + e) * 7, ey + 8,
                    ex - Math.cos(simTime * 1.8 + e) * 7, ey + 2,
                    ex + Math.sin(simTime * 1.4 + e) * 4, ey - 6
                );
                ctx.stroke();
            }
            ctx.restore();
        }

        // 6. Seasonal Trees (coastal valley) + Autumn Falling Leaves + Transpiration Plumes
        drawTree(0.41 * w, terrainY(0.41 * w, w, h), 0.92, state.season, atmo.T, sunStrength);
        drawTree(0.47 * w, terrainY(0.47 * w, w, h), 1.12, state.season, atmo.T, sunStrength);
        drawTree(0.53 * w, terrainY(0.53 * w, w, h), 0.85, state.season, atmo.T, sunStrength);

        if (state.season === 'Fall') {
            ctx.save();
            fallLeaves.forEach((lf) => {
                const ly = (0.52 * h) + ((simTime * lf.speed + lf.phase * 15) % (0.16 * h));
                const lx = lf.xFrac * w + Math.sin(simTime * 2.1 + lf.phase) * 9;
                ctx.fillStyle = lf.hue;
                ctx.beginPath();
                ctx.ellipse(lx, ly, 2.5, 1.4, simTime * 2 + lf.phase, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        if (state.season !== 'Winter' && atmo.tendency > 15 && atmo.T > 2) {
            ctx.save();
            ctx.strokeStyle = `rgba(220, 248, 255, ${Math.min(0.28, (atmo.tendency / 100) * 0.25)})`;
            ctx.lineWidth = 2;
            [0.41, 0.47, 0.53].forEach((tx, idx) => {
                const rise = (simTime * 14 + idx * 14) % 34;
                const y0 = terrainY(tx * w, w, h) - 48 - rise;
                ctx.globalAlpha = Math.max(0, 1 - rise / 34);
                ctx.beginPath();
                ctx.moveTo(tx * w, y0 + 10);
                ctx.quadraticCurveTo(tx * w + Math.sin(simTime * 2 + idx) * 6, y0 + 2, tx * w, y0 - 6);
                ctx.stroke();
            });
            ctx.restore();
        }

        // 7. Volumetric Clouds at LCL
        drawCloudBank(w, h, lclY, atmo);

        // 8. Multi-depth Precipitation + Splash Crowns
        for (let i = 0; i < precipDrops.length; i++) {
            const d = precipDrops[i];
            if (!d.active) continue;
            if (d.snow) {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + d.depth * 0.32})`;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (d.sleet) {
                ctx.fillStyle = 'rgba(210, 242, 255, 0.9)';
                ctx.fillRect(d.x, d.y, 2, 4);
            } else {
                ctx.strokeStyle = `rgba(218, 244, 255, ${0.42 + d.depth * 0.42})`;
                ctx.lineWidth = 1.1 + d.depth * 0.8;
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - 2.2 * d.depth, d.y + d.size);
                ctx.stroke();
            }
        }

        for (let i = 0; i < splashes.length; i++) {
            const s = splashes[i];
            if (!s.active) continue;
            const k = s.age / s.life;
            ctx.save();
            ctx.strokeStyle = `rgba(228, 248, 255, ${(1 - k) * 0.78})`;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, 2 + k * s.maxR, 1 + k * (s.maxR * 0.34), 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 9. Clean Field-Guide Pill Labels
        drawLabel(atmo.T <= 0 ? 'Frozen Ocean / Lake' : 'Ocean / Lake', 16, h - 16);
        drawLabel('Evaporation ↑', 0.14 * w, 0.57 * h);
        drawLabel('Transpiration ↑', 0.42 * w, 0.52 * h);
        drawLabel('Runoff ↓', 0.62 * w, 0.51 * h);
        drawLabel('Groundwater Aquifer', 0.47 * w, 0.915 * h);

        // 10. Branching Water-Cycle Molecules + Comet Trail on Tracked Drop
        for (let i = molecules.length - 1; i >= 0; i--) {
            const m = molecules[i];
            const isVapor = m.phase === 'evaporate' || m.phase === 'transpire' || m.phase === 'cloud';
            const isIce = m.tag === 'Snowing';
            const isTracked = state.trackDrop && i === 0;

            if (isTracked && m.trail.length > 1) {
                for (let ti = 0; ti < m.trail.length - 1; ti++) {
                    const pt = m.trail[ti];
                    const frac = (ti + 1) / m.trail.length;
                    ctx.fillStyle = `rgba(246, 201, 76, ${frac * 0.45})`;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 1.8 + frac * 3.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            if (isTracked) {
                ctx.save();
                ctx.fillStyle = 'rgba(246, 201, 76, 0.38)';
                ctx.beginPath();
                ctx.arc(m.x, m.y, 12.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.fillStyle = isTracked ? '#f6c94c' : isIce ? '#e0f2fe' : isVapor ? 'rgba(255, 255, 255, 0.88)' : '#1e90ff';
            ctx.strokeStyle = isTracked ? '#082c42' : isVapor ? 'rgba(14, 116, 174, 0.65)' : '#0a4a79';
            ctx.lineWidth = isTracked ? 2.2 : 1.2;
            ctx.beginPath();
            ctx.arc(m.x, m.y, isTracked ? 6.5 : isVapor ? 3.8 : 4.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            if (isTracked) {
                ctx.save();
                ctx.font = '700 11px system-ui, sans-serif';
                const labelText = m.tag;
                const tw = ctx.measureText(labelText).width;
                const bx = Math.min(w - tw - 18, Math.max(8, m.x + 10));
                const by = Math.max(20, m.y - 10);
                ctx.fillStyle = 'rgba(8, 44, 66, 0.92)';
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(bx - 6, by - 12, tw + 12, 18, 9);
                else ctx.rect(bx - 6, by - 12, tw + 12, 18);
                ctx.fill();
                ctx.fillStyle = '#f8e299';
                ctx.fillText(labelText, bx, by + 1);
                ctx.restore();
            }
        }
    }

    const diagramLoop = window.SimKit?.loop((dt) => {
        if (!state.playing || state.mode !== 'diagram') return;
        const safeDt = Math.min(dt, 0.05);
        const atmo = computeAtmosphere();
        simTime += safeDt;
        liquidLake?.update(safeDt);
        if (liquidLake && atmo.T > 0 && Math.random() < safeDt * (0.9 + atmo.precipRate * 1.4)) {
            liquidLake.impulse(32 + Math.random() * (simW * 0.28), -7 - atmo.precipRate * 7, 24);
        }
        stepParticles(safeDt, atmo);
        renderDiagram();
    }, { el: window.SimKit?.stage(diagramStage), maxDt: 0.05 });

    function syncEnginePlayback() {
        if (state.mode === 'diagram' && state.playing) {
            diagramLoop?.resume();
        } else {
            diagramLoop?.pause();
        }

        if (wcCloudSim) {
            if (state.mode === 'particle' && state.playing && particleStageVisible) {
                if (wcCloudSim.simKitLoop && wcCloudSim.simKitLoop.resume) {
                    wcCloudSim.running = true;
                    wcCloudSim.simKitLoop.resume();
                } else {
                    wcCloudSim.start();
                }
            } else {
                wcCloudSim.stop();
            }
        }
    }

    if ('IntersectionObserver' in window && particleStage) {
        const obs = new IntersectionObserver((entries) => {
            particleStageVisible = entries.some((entry) => entry.isIntersecting);
            syncEnginePlayback();
        }, { rootMargin: '180px' });
        obs.observe(particleStage);
    } else {
        particleStageVisible = true;
    }

    [['input', el.sun, 'sun'], ['input', el.temp, 'temperature'], ['input', el.humidity, 'humidity'], ['change', el.season, 'season']].forEach(([type, node, key]) => {
        node?.addEventListener(type, (event) => {
            state[key] = type === 'change' ? event.target.value : Number(event.target.value);
            updateReadouts();
            syncCloudSim();
            if (state.mode === 'diagram') renderDiagram();
        });
    });

    presetButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const p = PRESETS[button.dataset.weather];
            if (!p) return;
            Object.assign(state, p);
            if (el.sun) el.sun.value = String(p.sun);
            if (el.temp) el.temp.value = String(p.temperature);
            if (el.humidity) el.humidity.value = String(p.humidity);
            if (el.season) el.season.value = p.season;
            updateReadouts();
            syncCloudSim();
            if (state.mode === 'diagram') renderDiagram();
        });
    });

    document.getElementById('weather-save')?.addEventListener('click', () => {
        saved = { ...state, index: computeAtmosphere().tendency };
        updateReadouts();
    });

    el.toggle?.addEventListener('click', () => {
        state.playing = !state.playing;
        el.toggle.textContent = state.playing ? 'Pause Cycle' : 'Resume Cycle';
        el.toggle.setAttribute('aria-pressed', String(state.playing));
        syncEnginePlayback();
    });

    el.trackBtn?.addEventListener('click', () => {
        state.trackDrop = !state.trackDrop;
        el.trackBtn.textContent = state.trackDrop ? 'Follow 1 drop: On' : 'Follow 1 drop: Off';
        el.trackBtn.classList.toggle('is-active', state.trackDrop);
        el.trackBtn.setAttribute('aria-pressed', String(state.trackDrop));
        if (state.mode === 'diagram') renderDiagram();
    });

    el.reset?.addEventListener('click', () => {
        saved = null;
        simTime = 0;
        if (el.comparison) el.comparison.textContent = 'Save a result, change one variable, and compare.';
        state.sun = 65;
        state.temperature = 24;
        state.humidity = 55;
        state.season = 'Summer';
        state.playing = !prefersReduced;
        state.trackDrop = true;
        if (el.sun) el.sun.value = '65';
        if (el.temp) el.temp.value = '24';
        if (el.humidity) el.humidity.value = '55';
        if (el.season) el.season.value = 'Summer';
        if (el.toggle) {
            el.toggle.textContent = state.playing ? 'Pause Cycle' : 'Resume Cycle';
            el.toggle.setAttribute('aria-pressed', String(state.playing));
        }
        if (el.trackBtn) {
            el.trackBtn.textContent = 'Follow 1 drop: On';
            el.trackBtn.classList.add('is-active');
            el.trackBtn.setAttribute('aria-pressed', 'true');
        }
        updateReadouts();
        syncCloudSim();
        syncEnginePlayback();
        renderDiagram();
    });

    if (el.btnDiagram && el.btnParticle && particleStage) {
        el.btnDiagram.addEventListener('click', () => {
            state.mode = 'diagram';
            el.btnDiagram.classList.add('is-active');
            el.btnDiagram.setAttribute('aria-pressed', 'true');
            el.btnParticle.classList.remove('is-active');
            el.btnParticle.setAttribute('aria-pressed', 'false');
            diagramStage.hidden = false;
            particleStage.hidden = true;
            syncEnginePlayback();
            renderDiagram();
        });

        el.btnParticle.addEventListener('click', () => {
            state.mode = 'particle';
            el.btnParticle.classList.add('is-active');
            el.btnParticle.setAttribute('aria-pressed', 'true');
            el.btnDiagram.classList.remove('is-active');
            el.btnDiagram.setAttribute('aria-pressed', 'false');
            diagramStage.hidden = true;
            particleStage.hidden = false;
            particleStageVisible = true;

            let createdCloudSim = false;
            if (!wcCloudSim && window.CloudEngine) {
                wcCloudSim = window.CloudEngine.attach('wc-particle-canvas', {
                    preset: 'water_cycle_evaporation',
                    showLCL: true,
                    showAltitudeGuide: true,
                    interactive: true
                });
                createdCloudSim = true;
            } else if (wcCloudSim?.simKitHelper?.resize) {
                wcCloudSim.simKitHelper.resize();
            }
            syncCloudSim();
            if (createdCloudSim && wcCloudSim) {
                for (let k = 0; k < 55; k++) wcCloudSim.update(0.05);
                wcCloudSim.render();
            }
            syncEnginePlayback();
        });
    }

    if (!state.playing && el.toggle) el.toggle.textContent = 'Resume Cycle';
    el.toggle?.setAttribute('aria-pressed', String(state.playing));
    updateReadouts();
    syncCloudSim();
    renderDiagram();
    syncEnginePlayback();
}

/* ============================================================================
   USGS OFFICIAL DIAGRAM (Pan vs Lightbox fixed + Field Key)
   ============================================================================ */

function initUsgsDiagram() {
    const viewport = document.getElementById('usgs-diagram-viewport');
    const wrapper = document.getElementById('usgs-diagram-wrapper');
    const img = document.getElementById('usgs-diagram-img');
    const loading = document.getElementById('usgs-diagram-loading');
    const zoomLevelEl = document.getElementById('usgs-zoom-level');
    const zoomOutBtn = document.getElementById('usgs-zoom-out-btn');
    const zoomResetBtn = document.getElementById('usgs-zoom-reset-btn');
    const langBtn = document.getElementById('usgs-lang-toggle-btn');
    const lightboxBtn = document.getElementById('usgs-lightbox-btn');
    if (!viewport || !wrapper || !img) return;

    const DIAGRAM_SOURCES = {
        en: {
            src: 'https://labs.waterdata.usgs.gov/visualizations/images/USGS_WaterCycle_English_ONLINE.webp',
            alt: 'Illustrated diagram of the water cycle showing the major pools and fluxes of water on Earth, published by the U.S. Geological Survey.'
        },
        es: {
            src: 'https://labs.waterdata.usgs.gov/visualizations/images/USGS_WaterCycle_Spanish_ONLINE.webp',
            alt: 'Diagrama ilustrado del ciclo del agua que muestra los principales reservorios y flujos de agua en la Tierra, publicado por el Servicio Geologico de los Estados Unidos.'
        }
    };
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 5;
    const ZOOM_STEP = 0.4;

    const state = { zoom: 1, panX: 0, panY: 0, lang: 'en', loadedFull: false };
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragDistance = 0;
    let suppressClick = false;

    function applyTransform() {
        wrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
        if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round(state.zoom * 100)}%`;
        if (zoomOutBtn) zoomOutBtn.disabled = state.zoom <= MIN_ZOOM;
        if (zoomResetBtn) zoomResetBtn.disabled = state.zoom <= MIN_ZOOM;
    }

    function clampPan() {
        const container = viewport.getBoundingClientRect();
        const scaledWidth = wrapper.offsetWidth * state.zoom;
        const scaledHeight = wrapper.offsetHeight * state.zoom;
        const maxX = Math.max((scaledWidth - container.width) / 2, 0);
        const maxY = Math.max((scaledHeight - container.height) / 2, 0);
        state.panX = Math.max(Math.min(state.panX, maxX), -maxX);
        state.panY = Math.max(Math.min(state.panY, maxY), -maxY);
    }

    function setZoom(nextZoom) {
        state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
        if (state.zoom === MIN_ZOOM) {
            state.panX = 0;
            state.panY = 0;
        }
        clampPan();
        applyTransform();
    }

    function resetView() {
        state.zoom = MIN_ZOOM;
        state.panX = 0;
        state.panY = 0;
        applyTransform();
    }

    const fullResolutionBtn = document.getElementById('usgs-load-full-btn');

    function loadFullResolution(lang) {
        const target = DIAGRAM_SOURCES[lang];
        loading.textContent = 'Loading high-resolution diagram…';
        loading.hidden = false;
        if (fullResolutionBtn) {
            fullResolutionBtn.disabled = true;
            fullResolutionBtn.textContent = 'Loading…';
        }
        const probe = new Image();
        probe.onload = () => {
            img.src = target.src;
            img.alt = target.alt;
            state.loadedFull = true;
            loading.hidden = true;
            if (fullResolutionBtn) {
                fullResolutionBtn.disabled = false;
                fullResolutionBtn.textContent = 'Full Resolution Loaded';
            }
        };
        probe.onerror = () => {
            loading.hidden = true;
            if (fullResolutionBtn) {
                fullResolutionBtn.disabled = false;
                fullResolutionBtn.textContent = 'Try Full Resolution Again';
            }
        };
        probe.src = target.src;
    }

    document.getElementById('usgs-zoom-in-btn')?.addEventListener('click', () => setZoom(state.zoom + ZOOM_STEP));
    zoomOutBtn?.addEventListener('click', () => setZoom(state.zoom - ZOOM_STEP));
    zoomResetBtn?.addEventListener('click', resetView);
    lightboxBtn?.addEventListener('click', () => img.click());

    fullResolutionBtn?.addEventListener('click', () => {
        loadFullResolution(state.lang);
    });

    langBtn?.addEventListener('click', () => {
        state.lang = state.lang === 'en' ? 'es' : 'en';
        langBtn.textContent = state.lang === 'en' ? 'Español' : 'English';
        langBtn.setAttribute('aria-pressed', String(state.lang === 'es'));
        loadFullResolution(state.lang);
    });

    const descriptionBtn = document.getElementById('usgs-description-btn');
    const descriptionPanel = document.getElementById('usgs-description-panel');
    descriptionBtn?.addEventListener('click', () => {
        const isOpen = !descriptionPanel.hidden;
        descriptionPanel.hidden = isOpen;
        descriptionBtn.setAttribute('aria-expanded', String(!isOpen));
        descriptionBtn.textContent = isOpen ? 'Read the Official USGS Description' : 'Hide USGS Description';
    });

    viewport.addEventListener('wheel', (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom(state.zoom + delta);
    }, { passive: false });

    wrapper.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'mouse' || event.button !== 0 || state.zoom <= MIN_ZOOM) return;
        dragging = true;
        dragDistance = 0;
        suppressClick = false;
        wrapper.classList.add('is-dragging');
        dragStartX = event.clientX - state.panX;
        dragStartY = event.clientY - state.panY;
        wrapper.setPointerCapture(event.pointerId);
    });

    wrapper.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const nextX = event.clientX - dragStartX;
        const nextY = event.clientY - dragStartY;
        dragDistance += Math.hypot(nextX - state.panX, nextY - state.panY);
        if (dragDistance > 5) suppressClick = true;
        state.panX = nextX;
        state.panY = nextY;
        clampPan();
        applyTransform();
    });

    function stopDragging() {
        dragging = false;
        wrapper.classList.remove('is-dragging');
    }
    wrapper.addEventListener('pointerup', stopDragging);
    wrapper.addEventListener('pointercancel', stopDragging);
    wrapper.addEventListener('dragstart', (event) => event.preventDefault());

    wrapper.addEventListener('click', (event) => {
        if (suppressClick) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick = false;
        }
    }, true);

    let pinchStartDistance = null;
    let pinchStartZoom = state.zoom;
    let touchDragStart = null;

    function touchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    wrapper.addEventListener('touchstart', (event) => {
        if (event.touches.length === 2) {
            pinchStartDistance = touchDistance(event.touches);
            pinchStartZoom = state.zoom;
        } else if (event.touches.length === 1 && state.zoom > MIN_ZOOM) {
            touchDragStart = {
                x: event.touches[0].clientX - state.panX,
                y: event.touches[0].clientY - state.panY
            };
        }
    }, { passive: true });

    wrapper.addEventListener('touchmove', (event) => {
        if (event.touches.length === 2 && pinchStartDistance) {
            event.preventDefault();
            const scaleChange = touchDistance(event.touches) / pinchStartDistance;
            setZoom(pinchStartZoom * scaleChange);
        } else if (event.touches.length === 1 && touchDragStart) {
            suppressClick = true;
            state.panX = event.touches[0].clientX - touchDragStart.x;
            state.panY = event.touches[0].clientY - touchDragStart.y;
            clampPan();
            applyTransform();
        }
    }, { passive: false });

    wrapper.addEventListener('touchend', () => {
        pinchStartDistance = null;
        touchDragStart = null;
    });

    // USGS Pools & Fluxes Field Key Tabs
    const keyCopy = {
        pools: '<strong>Pools store water:</strong> Oceans (96.5% of all water), ice sheets &amp; glaciers, snowpack, permafrost, groundwater aquifers, soil moisture, freshwater &amp; saline lakes, wetlands, rivers, living organisms, and atmospheric moisture.',
        fluxes: '<strong>Fluxes move water between pools:</strong> Evaporation, evapotranspiration, atmospheric transport, precipitation, snowmelt, surface runoff, streamflow, infiltration, groundwater recharge, and natural discharge at springs and coasts.',
        human: '<strong>Human interactions:</strong> Dams and artificial reservoirs alter river timing; irrigation, municipal supply, and industrial cooling withdraw surface and groundwater; urban pavement increases fast runoff and agricultural/industrial discharge affects water quality.'
    };
    const keyTabs = Array.from(document.querySelectorAll('.usgs-key-tab'));
    const keyBody = document.getElementById('usgs-key-body');
    function selectKey(key) {
        keyTabs.forEach((tab) => {
            const active = tab.dataset.usgsKey === key;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', String(active));
        });
        if (keyBody) keyBody.innerHTML = keyCopy[key] || keyCopy.pools;
    }
    keyTabs.forEach((tab) => tab.addEventListener('click', () => selectKey(tab.dataset.usgsKey)));
    selectKey('pools');

    applyTransform();
}

/* ============================================================================
   STATES OF WATER & H₂O MOLECULAR MOTION LAB (#states)
   ============================================================================ */

function initStatesLab() {
    const curveSvg = document.getElementById('phase-change-canvas');
    const molCanvas = document.getElementById('molecule-canvas');
    const slider = document.getElementById('phase-temp-slider');
    const tempOut = document.getElementById('phase-temp-value');
    const stateBadge = document.getElementById('phase-state-badge');
    const molReadout = document.getElementById('molecule-readout');
    const motionBtn = document.getElementById('molecule-motion-btn');
    const presetChips = Array.from(document.querySelectorAll('[data-phase-temp]'));
    if (!curveSvg || !molCanvas || !slider) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tempC = Number(slider.value) || 20;
    let molRunning = !prefersReduced;
    let molW = 360;
    let molH = 240;
    let molTime = 0;
    let themeColors = window.SimKit?.theme?.colors?.() || { text: '#1d1d1f', textMuted: '#6e6e73', accent: '#0071e3' };

    // 28-site open hexagonal ice crystal lattice (normalized coordinates)
    const hexPts = [
        [0.18, 0.34], [0.27, 0.25], [0.37, 0.34], [0.37, 0.49], [0.27, 0.58], [0.18, 0.49],
        [0.47, 0.25], [0.57, 0.34], [0.57, 0.49], [0.47, 0.58],
        [0.67, 0.25], [0.77, 0.34], [0.77, 0.49], [0.67, 0.58],
        [0.18, 0.67], [0.27, 0.76], [0.37, 0.67], [0.47, 0.76], [0.57, 0.67], [0.67, 0.76], [0.77, 0.67],
        [0.09, 0.42], [0.09, 0.57], [0.86, 0.42], [0.86, 0.57],
        [0.37, 0.17], [0.57, 0.17], [0.47, 0.85]
    ];

    const h2o = Array.from({ length: 28 }, (_, i) => ({
        x: (0.14 + (i % 7) * 0.12) * 360,
        y: (0.50 + Math.floor(i / 7) * 0.12) * 240,
        vx: (Math.random() - 0.5) * 65,
        vy: (Math.random() - 0.5) * 65,
        angle: (i * 1.1) % (Math.PI * 2),
        omega: (Math.random() - 0.5) * 2.4,
        isVapor: i < 2,
        trail: []
    }));

    const bubbles = Array.from({ length: 14 }, (_, i) => ({
        xFrac: 0.12 + ((i * 0.068) % 0.78),
        yFrac: 0.96 - ((i * 0.19) % 0.45),
        r: 2 + (i % 3) * 1.4,
        speed: 0.32 + (i % 4) * 0.08
    }));

    let swirlPulse = { active: false, x: 0, y: 0, age: 0 };

    function drawHeatingCurve() {
        const ink = themeColors.text || '#1d1d1f';
        const muted = themeColors.textMuted || '#6e6e73';
        const accent = themeColors.accent || '#0071e3';

        curveSvg.innerHTML = '';
        const x0 = 62;
        const x1 = 602;
        const yTop = 28;
        const yBot = 266;
        const toY = (c) => yBot - ((c + 25) / 150) * (yBot - yTop);

        const y100 = toY(100);
        const y0 = toY(0);
        curveSvg.appendChild(svg('rect', {
            x: x0, y: y100, width: x1 - x0, height: y0 - y100,
            fill: 'rgba(88, 197, 220, 0.14)'
        }));
        curveSvg.appendChild(svg('text', {
            x: x0 + 14, y: y100 + 24, 'text-anchor': 'start', 'font-size': 11.5, 'font-weight': 700, fill: accent
        }, 'Evaporation Zone (0–100°C):'));
        curveSvg.appendChild(svg('text', {
            x: x0 + 14, y: y100 + 40, 'text-anchor': 'start', 'font-size': 11, 'font-weight': 600, fill: muted
        }, 'click or drag curve to set temperature'));

        [0, 100].forEach((deg) => {
            const yy = toY(deg);
            curveSvg.appendChild(svg('line', {
                x1: x0, y1: yy, x2: x1, y2: yy,
                stroke: muted, 'stroke-opacity': 0.35, 'stroke-dasharray': '4 4'
            }));
            curveSvg.appendChild(svg('text', {
                x: x0 - 8, y: yy + 4, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 700, fill: ink
            }, `${deg}°C`));
        });

        curveSvg.appendChild(svg('line', { x1: x0, y1: yTop, x2: x0, y2: yBot, stroke: ink, 'stroke-width': 2 }));
        curveSvg.appendChild(svg('line', { x1: x0, y1: yBot, x2: x1, y2: yBot, stroke: ink, 'stroke-width': 2 }));
        curveSvg.appendChild(svg('text', { x: (x0 + x1) / 2, y: 296, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: ink }, 'Thermal Energy Added →'));
        curveSvg.appendChild(svg('text', { x: 18, y: (yTop + yBot) / 2, transform: `rotate(-90 18 ${(yTop + yBot) / 2})`, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: ink }, 'Temp (°C)'));

        const pStart = [x0 + 18, toY(-25)];
        const pMeltA = [x0 + 88, toY(0)];
        const pMeltB = [x0 + 168, toY(0)];
        const pBoilA = [x0 + 338, toY(100)];
        const pBoilB = [x0 + 468, toY(100)];
        const pEnd = [x0 + 528, toY(125)];

        const segments = [
            [pStart, pMeltA, '#38bdf8'],
            [pMeltA, pMeltB, '#f59e0b'],
            [pMeltB, pBoilA, '#0284c7'],
            [pBoilA, pBoilB, '#ea580c'],
            [pBoilB, pEnd, '#a855f7']
        ];
        segments.forEach(([a, b, stroke]) => {
            curveSvg.appendChild(svg('line', {
                x1: a[0], y1: a[1], x2: b[0], y2: b[1],
                stroke, 'stroke-width': 4.5, 'stroke-linecap': 'round'
            }));
        });

        curveSvg.appendChild(svg('text', { x: x0 + 38, y: toY(-15), 'font-size': 11, 'font-weight': 700, fill: ink }, 'Ice'));
        curveSvg.appendChild(svg('text', { x: (pMeltA[0] + pMeltB[0]) / 2, y: toY(0) + 17, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: muted }, 'Melt ↔ Freeze'));
        curveSvg.appendChild(svg('text', { x: (pMeltB[0] + pBoilA[0]) / 2 + 12, y: toY(52), 'font-size': 12, 'font-weight': 700, fill: ink }, 'Liquid Water'));
        curveSvg.appendChild(svg('text', { x: (pBoilA[0] + pBoilB[0]) / 2, y: toY(100) - 10, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: muted }, 'Boil ↔ Condense'));
        curveSvg.appendChild(svg('text', { x: x0 + 522, y: toY(112), 'font-size': 11, 'font-weight': 700, fill: ink }, 'Vapor'));

        curveSvg.appendChild(svg('path', {
            d: `M ${x0 + 70} ${toY(-8)} Q ${x0 + 380} ${toY(-6)} ${x0 + 510} ${toY(106)}`,
            fill: 'none', stroke: '#d97706', 'stroke-width': 2, 'stroke-dasharray': '5 5'
        }));
        curveSvg.appendChild(svg('text', {
            x: x0 + 390, y: toY(18), 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#b45309'
        }, 'Sublimation ↔ Deposition (skips liquid)'));

        let mx;
        let my;
        if (tempC < 0) {
            const frac = (tempC + 25) / 25;
            mx = pStart[0] + (pMeltA[0] - pStart[0]) * frac;
            my = toY(tempC);
        } else if (tempC === 0) {
            mx = (pMeltA[0] + pMeltB[0]) / 2;
            my = toY(0);
        } else if (tempC < 100) {
            const frac = tempC / 100;
            mx = pMeltB[0] + (pBoilA[0] - pMeltB[0]) * frac;
            my = toY(tempC);
        } else if (tempC === 100) {
            mx = (pBoilA[0] + pBoilB[0]) / 2;
            my = toY(100);
        } else {
            const frac = (tempC - 100) / 25;
            mx = pBoilB[0] + (pEnd[0] - pBoilB[0]) * frac;
            my = toY(tempC);
        }

        curveSvg.appendChild(svg('circle', { cx: mx, cy: my, r: 12, fill: 'rgba(246, 201, 76, 0.38)' }));
        curveSvg.appendChild(svg('circle', { cx: mx, cy: my, r: 6.5, fill: '#f6c94c', stroke: '#082c42', 'stroke-width': 2 }));
    }

    // Scrub temperature directly along the heating curve SVG
    let curveDragging = false;
    function scrubCurve(clientX, clientY) {
        const rect = curveSvg.getBoundingClientRect();
        const svgX = ((clientX - rect.left) / rect.width) * 640;
        const svgY = ((clientY - rect.top) / rect.height) * 310;
        const x0 = 62;
        const yTop = 28;
        const yBot = 266;
        let nextT;
        if (svgX >= x0 + 84 && svgX <= x0 + 172 && Math.abs(svgY - 226) < 26) {
            nextT = 0;
        } else if (svgX >= x0 + 334 && svgX <= x0 + 472 && Math.abs(svgY - 68) < 26) {
            nextT = 100;
        } else {
            nextT = Math.round(((yBot - svgY) / (yBot - yTop)) * 150 - 25);
        }
        tempC = Math.max(-25, Math.min(125, nextT));
        slider.value = String(tempC);
        updatePhaseUI();
    }
    curveSvg.addEventListener('pointerdown', (e) => {
        curveDragging = true;
        curveSvg.setPointerCapture?.(e.pointerId);
        scrubCurve(e.clientX, e.clientY);
    });
    curveSvg.addEventListener('pointermove', (e) => {
        if (curveDragging) scrubCurve(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', () => { curveDragging = false; });

    function drawH2OMolecule(ctx, x, y, angle, scale = 1, isVapor = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const rO = 6.2 * scale;
        const rH = 3.6 * scale;
        const bond = 8.4 * scale;
        const halfAngle = (104.5 / 2) * (Math.PI / 180);

        const h1x = Math.cos(-halfAngle) * bond;
        const h1y = Math.sin(-halfAngle) * bond;
        const h2x = Math.cos(halfAngle) * bond;
        const h2y = Math.sin(halfAngle) * bond;

        ctx.strokeStyle = 'rgba(226, 244, 255, 0.78)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(h1x, h1y);
        ctx.moveTo(0, 0);
        ctx.lineTo(h2x, h2y);
        ctx.stroke();

        // 3D-shaded oxygen sphere
        const oGrad = ctx.createRadialGradient(-rO * 0.35, -rO * 0.35, 1, 0, 0, rO);
        oGrad.addColorStop(0, isVapor ? '#bae6fd' : '#38bdf8');
        oGrad.addColorStop(0.65, isVapor ? '#0284c7' : '#0369a1');
        oGrad.addColorStop(1, '#082f49');
        ctx.fillStyle = oGrad;
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, rO, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3D-shaded hydrogen spheres
        [[h1x, h1y], [h2x, h2y]].forEach(([hx, hy]) => {
            const hGrad = ctx.createRadialGradient(hx - 1, hy - 1, 0.5, hx, hy, rH);
            hGrad.addColorStop(0, '#ffffff');
            hGrad.addColorStop(1, '#94a3b8');
            ctx.fillStyle = hGrad;
            ctx.beginPath();
            ctx.arc(hx, hy, rH, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    let molReady = false;
    const molHelper = window.SimKit?.canvas2d(molCanvas, {
        box: molCanvas.parentElement,
        onResize: (_, w, h) => {
            molW = w;
            molH = h;
            if (molReady) renderMolecules(0);
        }
    });
    const mCtx = molHelper?.ctx || molCanvas.getContext('2d');
    molReady = true;

    molCanvas.addEventListener('pointerdown', (e) => {
        const rect = molCanvas.getBoundingClientRect();
        swirlPulse = { active: true, x: e.clientX - rect.left, y: e.clientY - rect.top, age: 0 };
        h2o.forEach((p) => {
            const dx = p.x - swirlPulse.x;
            const dy = p.y - swirlPulse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 75 && dist > 1) {
                p.vx += (dx / dist) * 55;
                p.vy += (dy / dist) * 55;
            }
        });
    });

    function renderMolecules(dt) {
        const w = molW;
        const h = molH;
        molTime += dt;
        mCtx.clearRect(0, 0, w, h);

        const bg = mCtx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, tempC >= 100 ? '#1b1628' : '#081826');
        bg.addColorStop(1, tempC >= 100 ? '#271722' : '#0e2b40');
        mCtx.fillStyle = bg;
        mCtx.fillRect(0, 0, w, h);

        const surfaceY = 0.43 * h;

        // Ambient frost vignette below 0°C
        if (tempC < 0) {
            const frost = mCtx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
            frost.addColorStop(0, 'rgba(186, 230, 253, 0)');
            frost.addColorStop(1, 'rgba(186, 230, 253, 0.16)');
            mCtx.fillStyle = frost;
            mCtx.fillRect(0, 0, w, h);
        }

        // Liquid volume & undulating meniscus for 0..100°C
        if (tempC >= 0 && tempC <= 100) {
            const liqGrad = mCtx.createLinearGradient(0, surfaceY, 0, h);
            liqGrad.addColorStop(0, 'rgba(14, 116, 174, 0.34)');
            liqGrad.addColorStop(1, 'rgba(7, 59, 98, 0.56)');
            mCtx.fillStyle = liqGrad;
            mCtx.beginPath();
            mCtx.moveTo(0, h);
            for (let px = 0; px <= w + 10; px += 10) {
                const wave = Math.sin(px * 0.04 + molTime * (tempC === 100 ? 6 : 2.2)) * (tempC === 100 ? 4 : 2);
                mCtx.lineTo(px, surfaceY + wave);
            }
            mCtx.lineTo(w, h);
            mCtx.closePath();
            mCtx.fill();

            mCtx.strokeStyle = 'rgba(125, 211, 252, 0.6)';
            mCtx.lineWidth = 1.6;
            mCtx.beginPath();
            for (let px = 0; px <= w + 10; px += 10) {
                const wave = Math.sin(px * 0.04 + molTime * (tempC === 100 ? 6 : 2.2)) * (tempC === 100 ? 4 : 2);
                if (px === 0) mCtx.moveTo(px, surfaceY + wave);
                else mCtx.lineTo(px, surfaceY + wave);
            }
            mCtx.stroke();
        }

        // Glowing thermal base + nucleating boiling bubbles at 100°C
        if (tempC === 100) {
            const heatGlow = mCtx.createLinearGradient(0, h - 26, 0, h);
            heatGlow.addColorStop(0, 'rgba(249, 115, 22, 0)');
            heatGlow.addColorStop(1, 'rgba(249, 115, 22, 0.48)');
            mCtx.fillStyle = heatGlow;
            mCtx.fillRect(0, h - 26, w, 26);

            mCtx.save();
            bubbles.forEach((b) => {
                if (dt > 0) {
                    b.yFrac -= dt * b.speed;
                    if (b.yFrac < 0.44) b.yFrac = 0.97;
                }
                const bx = b.xFrac * w + Math.sin(molTime * 4 + b.r) * 3;
                const by = b.yFrac * h;
                const br = b.r * (1 + (0.97 - b.yFrac) * 1.4);
                mCtx.strokeStyle = 'rgba(224, 247, 255, 0.65)';
                mCtx.lineWidth = 1.1;
                mCtx.beginPath();
                mCtx.arc(bx, by, br, 0, Math.PI * 2);
                mCtx.stroke();
            });
            mCtx.restore();
        }

        const speedBoost = 0.42 + Math.max(0, (tempC + 25) / 150) * 1.95;
        const targetVapor = tempC < 0 ? 0 : tempC === 0 ? 1 : tempC >= 100 ? h2o.length : 1 + Math.floor((tempC / 100) * 7);

        // Physics step
        if (dt > 0) {
            for (let i = 0; i < h2o.length; i++) {
                const p = h2o[i];
                if (tempC < 0) {
                    const tx = hexPts[i][0] * w;
                    const ty = hexPts[i][1] * h;
                    p.x += (tx - p.x) * Math.min(1, dt * 8);
                    p.y += (ty - p.y) * Math.min(1, dt * 8);
                    p.angle = (i % 6) * (Math.PI / 3);
                } else if (tempC === 0 && i < 12) {
                    // Floating melting hexagonal ice cluster near top of liquid pool
                    const tx = (0.24 + (i % 4) * 0.14) * w + Math.sin(molTime * 0.6) * 10;
                    const ty = (0.37 + Math.floor(i / 4) * 0.11) * h + Math.cos(molTime * 0.8 + i) * 2;
                    p.x += (tx - p.x) * Math.min(1, dt * 6);
                    p.y += (ty - p.y) * Math.min(1, dt * 6);
                    p.angle = (i % 6) * (Math.PI / 3) + Math.sin(molTime + i) * 0.15;
                } else {
                    const isVapor = i < targetVapor;
                    p.isVapor = isVapor;
                    const minY = isVapor ? 28 : surfaceY + 14;
                    const maxY = isVapor ? (tempC >= 100 ? h - 18 : surfaceY - 12) : h - 18;
                    const velScale = (isVapor ? 1.65 : 0.78) * speedBoost;

                    p.x += p.vx * velScale * dt;
                    p.y += p.vy * velScale * dt;
                    p.angle += p.omega * speedBoost * dt;

                    if (p.x < 18) { p.x = 18; p.vx = Math.abs(p.vx); }
                    if (p.x > w - 18) { p.x = w - 18; p.vx = -Math.abs(p.vx); }
                    if (p.y < minY) { p.y = minY; p.vy = Math.abs(p.vy); }
                    if (p.y > maxY) { p.y = maxY; p.vy = -Math.abs(p.vy); }

                    if (tempC > 100) {
                        p.trail.push({ x: p.x, y: p.y });
                        if (p.trail.length > 5) p.trail.shift();
                    } else if (p.trail.length) {
                        p.trail.length = 0;
                    }
                }
            }

            // Soft-sphere pairwise repulsion in liquid/gas so molecules jostle instead of overlapping
            if (tempC >= 0) {
                const minDist = tempC > 100 ? 22 : 24;
                for (let i = 0; i < h2o.length; i++) {
                    if (tempC === 0 && i < 12) continue;
                    for (let j = i + 1; j < h2o.length; j++) {
                        if (tempC === 0 && j < 12) continue;
                        const a = h2o[i];
                        const b = h2o[j];
                        const dx = b.x - a.x;
                        const dy = b.y - a.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist > 0.5 && dist < minDist) {
                            const push = (minDist - dist) * 1.4;
                            const nx = dx / dist;
                            const ny = dy / dist;
                            a.vx -= nx * push;
                            a.vy -= ny * push;
                            b.vx += nx * push;
                            b.vy += ny * push;
                        }
                    }
                    // Cap velocity so speeds stay smooth
                    const p = h2o[i];
                    const spd = Math.hypot(p.vx, p.vy);
                    if (spd > 95) {
                        p.vx = (p.vx / spd) * 95;
                        p.vy = (p.vy / spd) * 95;
                    }
                }
            }
        }

        // Dynamic proximity-based hydrogen bonds (H···O)
        const hBondDist = tempC < 0 ? 58 : tempC <= 100 ? 34 : 0;
        let activeHBonds = 0;
        if (hBondDist > 0) {
            mCtx.save();
            mCtx.setLineDash([3, 3]);
            mCtx.lineWidth = tempC < 0 ? 1.5 : 1.1;
            for (let i = 0; i < h2o.length; i++) {
                for (let j = i + 1; j < h2o.length; j++) {
                    const a = h2o[i];
                    const b = h2o[j];
                    if ((tempC > 0 && (a.isVapor || b.isVapor)) && tempC < 100) continue;
                    const dist = Math.hypot(b.x - a.x, b.y - a.y);
                    if (dist < hBondDist) {
                        activeHBonds++;
                        const alpha = tempC < 0 ? 0.55 : (1 - dist / hBondDist) * 0.45;
                        mCtx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
                        mCtx.beginPath();
                        mCtx.moveTo(a.x, a.y);
                        mCtx.lineTo(b.x, b.y);
                        mCtx.stroke();
                    }
                }
            }
            mCtx.restore();
        }

        // Draw molecules (+ vibration jitter for frozen crystal & trails for hot steam)
        const jitterAmp = tempC < 0 ? 1.0 + ((tempC + 25) / 25) * 1.6 : 0;
        h2o.forEach((p, idx) => {
            if (p.trail.length > 1 && tempC > 100) {
                mCtx.strokeStyle = 'rgba(125, 211, 252, 0.28)';
                mCtx.lineWidth = 2;
                mCtx.beginPath();
                p.trail.forEach((pt, ti) => (ti === 0 ? mCtx.moveTo(pt.x, pt.y) : mCtx.lineTo(pt.x, pt.y)));
                mCtx.stroke();
            }
            const jx = jitterAmp ? Math.sin(molTime * 16 + idx * 1.9) * jitterAmp : 0;
            const jy = jitterAmp ? Math.cos(molTime * 18 + idx * 2.3) * jitterAmp : 0;
            const vaporDraw = tempC >= 100 || (tempC > 0 && idx < targetVapor);
            drawH2OMolecule(mCtx, p.x + jx, p.y + jy, p.angle, 0.9, vaporDraw);
        });

        // Pointer thermal ripple ring
        if (swirlPulse.active) {
            swirlPulse.age += dt;
            const k = swirlPulse.age / 0.55;
            if (k >= 1) swirlPulse.active = false;
            else {
                mCtx.strokeStyle = `rgba(246, 201, 76, ${1 - k})`;
                mCtx.lineWidth = 2;
                mCtx.beginPath();
                mCtx.arc(swirlPulse.x, swirlPulse.y, 10 + k * 48, 0, Math.PI * 2);
                mCtx.stroke();
            }
        }

        // Clean HUD badge inside molecule chamber
        mCtx.save();
        mCtx.fillStyle = 'rgba(7, 22, 34, 0.74)';
        mCtx.fillRect(0, 0, w, 24);
        mCtx.fillStyle = '#e0f2fe';
        mCtx.font = '600 11px system-ui, sans-serif';
        const hudText = tempC < 0
            ? `Hexagonal Ice Lattice · ${activeHBonds} H-bonds locked (floats ~9% less dense)`
            : tempC === 0
            ? `0°C Melting/Freezing · Ice cluster floats on liquid water`
            : tempC < 100
            ? `Liquid (${activeHBonds} fleeting H-bonds) + ${targetVapor} surface vapor escaping`
            : tempC === 100
            ? `100°C Boiling · Vapor bubbles nucleating throughout volume`
            : `Gas Vapor · H-bonds broken, rapid thermal motion`;
        mCtx.fillText(hudText, 10, 16);
        mCtx.restore();
    }

    const molLoop = window.SimKit?.loop((dt) => {
        if (!molRunning) return;
        renderMolecules(Math.min(dt, 0.05));
    }, { el: window.SimKit?.stage(molCanvas), maxDt: 0.05 });

    function updatePhaseUI() {
        const tempF = Math.round((tempC * 9) / 5 + 32);
        if (tempOut) tempOut.textContent = `${tempC}°C (${tempF}°F)`;

        let badge = 'Liquid · Water';
        let note = 'Liquid water molecules slide past neighbors. The fastest molecules near the surface still escape as invisible vapor.';
        if (tempC < 0) {
            badge = 'Solid · Ice Crystal';
            note = 'Below 0°C, H₂O locks into open hexagonal rings held by hydrogen bonds — leaving extra space so solid ice is ~9% less dense than liquid water and floats.';
        } else if (tempC === 0) {
            badge = 'Melting / Freezing · 0°C';
            note = 'At 0°C, added thermal energy breaks crystal bonds without raising temperature until all ice melts. Notice the ice cluster floating near the top!';
        } else if (tempC < 100) {
            badge = tempC >= 30 ? 'Warm Liquid · Fast Evaporation' : 'Liquid · Water';
            note = `At ${tempC}°C, transient hydrogen bonds break and reform while ${1 + Math.floor((tempC / 100) * 7)} high-energy molecules escape into the air as vapor.`;
        } else if (tempC === 100) {
            badge = 'Boiling / Condensing · 100°C';
            note = 'At 100°C (sea level), thermal energy turns liquid into vapor throughout the entire volume, forming rising bubbles.';
        } else {
            badge = 'Gas · Water Vapor';
            note = 'Above 100°C, H₂O molecules overcome intermolecular attractions completely, moving rapidly and filling the entire space.';
        }

        if (stateBadge) stateBadge.textContent = badge;
        if (molReadout) molReadout.textContent = note;

        presetChips.forEach((chip) => {
            chip.classList.toggle('is-active', Number(chip.dataset.phaseTemp) === tempC);
        });
        drawHeatingCurve();
        renderMolecules(0);
    }

    slider.addEventListener('input', (event) => {
        tempC = Number(event.target.value);
        updatePhaseUI();
    });

    presetChips.forEach((chip) => {
        chip.addEventListener('click', () => {
            tempC = Number(chip.dataset.phaseTemp);
            slider.value = String(tempC);
            updatePhaseUI();
        });
    });

    motionBtn?.addEventListener('click', () => {
        molRunning = !molRunning;
        motionBtn.textContent = molRunning ? 'Pause Molecules' : 'Resume Molecules';
        motionBtn.setAttribute('aria-pressed', String(!molRunning));
        if (molRunning) molLoop?.resume();
        else molLoop?.pause();
    });

    if (!molRunning && motionBtn) {
        motionBtn.textContent = 'Resume Molecules';
        motionBtn.setAttribute('aria-pressed', 'true');
        molLoop?.pause();
    }

    window.SimKit?.theme?.onChange((colors) => {
        themeColors = colors;
        drawHeatingCurve();
    });

    updatePhaseUI();
}

/* ============================================================================
   TWO ENGINES & FOLLOW ONE DROP JOURNEY SIMULATOR (#sun)
   ============================================================================ */

function initDropJourney() {
    const startSelect = document.getElementById('journey-start-select');
    const stepBtn = document.getElementById('journey-step-btn');
    const autoBtn = document.getElementById('journey-auto-btn');
    const resetBtn = document.getElementById('journey-reset-btn');
    const currentPill = document.getElementById('journey-current-pill');
    const reflection = document.getElementById('journey-reflection');
    const trail = document.getElementById('journey-trail');
    const jCanvas = document.getElementById('journey-canvas');
    if (!startSelect || !stepBtn || !trail) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const POOL_NAMES = {
        ocean: 'Ocean',
        atmosphere: 'Atmosphere',
        glacier: 'Glacier & Snowpack',
        river: 'River & Lake',
        soil: 'Soil Moisture',
        plant: 'Living Plant',
        groundwater: 'Groundwater Aquifer'
    };

    const POOL_STATES = {
        ocean: 'Liquid saltwater',
        atmosphere: 'Vapor & cloud droplets',
        glacier: 'Solid snow & ice',
        river: 'Liquid freshwater',
        soil: 'Capillary soil water',
        plant: 'Sap in roots & leaves',
        groundwater: 'Deep aquifer water'
    };

    const POOL_POS = {
        ocean: { x: 0.14, y: 0.68 },
        atmosphere: { x: 0.48, y: 0.19 },
        glacier: { x: 0.86, y: 0.31 },
        river: { x: 0.67, y: 0.56 },
        soil: { x: 0.44, y: 0.72 },
        plant: { x: 0.38, y: 0.54 },
        groundwater: { x: 0.62, y: 0.87 }
    };

    const TRANSITIONS = {
        ocean: [
            { to: 'atmosphere', process: 'Evaporation', driver: '☀️ Solar heat', weight: 0.65, days: 1100, mode: 'vapor' },
            { to: 'ocean', process: 'Circulates in ocean currents', driver: '☀️ Wind & currents', weight: 0.35, days: 365 * 400, mode: 'loop' }
        ],
        atmosphere: [
            { to: 'ocean', process: 'Precipitation over sea', driver: '⬇️ Gravity', weight: 0.45, days: 9, mode: 'rain' },
            { to: 'river', process: 'Rain onto streams/lakes', driver: '⬇️ Gravity', weight: 0.25, days: 9, mode: 'rain' },
            { to: 'soil', process: 'Rain soaking topsoil', driver: '⬇️ Gravity', weight: 0.18, days: 9, mode: 'rain' },
            { to: 'glacier', process: 'Snowfall on high peaks', driver: '⬇️ Gravity', weight: 0.12, days: 10, mode: 'snow' }
        ],
        glacier: [
            { to: 'river', process: 'Spring snowmelt runoff', driver: '☀️ Melt + ⬇️ Gravity', weight: 0.72, days: 365 * 45, mode: 'water' },
            { to: 'atmosphere', process: 'Sublimation into dry air', driver: '☀️ Solar energy', weight: 0.28, days: 365 * 18, mode: 'vapor' }
        ],
        river: [
            { to: 'ocean', process: 'Streamflow to coast', driver: '⬇️ Gravity', weight: 0.55, days: 14, mode: 'water' },
            { to: 'atmosphere', process: 'Surface evaporation', driver: '☀️ Solar energy', weight: 0.25, days: 10, mode: 'vapor' },
            { to: 'soil', process: 'Riverbank seepage', driver: '⬇️ Gravity', weight: 0.20, days: 16, mode: 'seep' }
        ],
        soil: [
            { to: 'plant', process: 'Root absorption', driver: '🌱 Osmosis & xylem pull', weight: 0.36, days: 22, mode: 'capillary' },
            { to: 'groundwater', process: 'Deep percolation', driver: '⬇️ Gravity', weight: 0.34, days: 90, mode: 'seep' },
            { to: 'atmosphere', process: 'Soil evaporation', driver: '☀️ Solar energy', weight: 0.30, days: 14, mode: 'vapor' }
        ],
        plant: [
            { to: 'atmosphere', process: 'Transpiration through stomata', driver: '☀️ Solar energy', weight: 1.0, days: 2, mode: 'vapor' }
        ],
        groundwater: [
            { to: 'river', process: 'Spring discharge to stream', driver: '⬇️ Gravity & pressure', weight: 0.45, days: 365 * 160, mode: 'water' },
            { to: 'ocean', process: 'Submarine coastal discharge', driver: '⬇️ Gravity', weight: 0.30, days: 365 * 450, mode: 'seep' },
            { to: 'groundwater', process: 'Stored slowly in aquifer', driver: '⬇️ Deep rock pores', weight: 0.25, days: 365 * 850, mode: 'loop' }
        ]
    };

    let currentPool = startSelect.value;
    let steps = [];
    let elapsedDays = 0;
    let jW = 680;
    let jH = 290;
    let jTime = 0;
    let activeAnim = null;
    let autoTimer = null;
    let arrivalSplash = null;

    function formatElapsed(days) {
        if (days <= 0) return '0 days';
        if (days < 60) return `${Math.round(days)} days`;
        if (days < 365) return `${Math.round(days / 30)} months`;
        return `${Math.round(days / 365).toLocaleString()} yrs`;
    }

    function pickTransition(pool) {
        const list = TRANSITIONS[pool] || TRANSITIONS.ocean;
        const total = list.reduce((sum, item) => sum + item.weight, 0);
        let r = Math.random() * total;
        for (const item of list) {
            r -= item.weight;
            if (r <= 0) return item;
        }
        return list[0];
    }

    function renderJourney() {
        const label = POOL_NAMES[currentPool] || currentPool;
        if (currentPill) currentPill.textContent = `Step ${steps.length} · In ${label} (${formatElapsed(elapsedDays)})`;

        trail.replaceChildren();
        if (!steps.length) {
            const li = document.createElement('li');
            li.className = 'wc-journey-chip';
            li.innerHTML = `<strong>Start:</strong> Drop begins in <strong>${label}</strong>`;
            trail.appendChild(li);
            if (reflection) reflection.textContent = 'Click "Next Step" to trace a probabilistic path driven by solar energy and gravity.';
            return;
        }

        steps.forEach((step, idx) => {
            const li = document.createElement('li');
            li.className = 'wc-journey-chip';
            li.innerHTML = `<strong>${idx + 1}.</strong> ${POOL_NAMES[step.from]} → <em>${step.process}</em> (${step.driver}) → <strong>${POOL_NAMES[step.to]}</strong>`;
            trail.appendChild(li);
        });

        const visited = new Set([steps[0].from, ...steps.map((s) => s.to)]);
        if (reflection) {
            reflection.textContent = `After ${steps.length} step${steps.length === 1 ? '' : 's'} (~${formatElapsed(elapsedDays)} simulated), this drop visited ${visited.size} unique pool${visited.size === 1 ? '' : 's'} — proving real water cycles through branching shortcuts rather than one fixed circle.`;
        }
    }

    function bezierCurvePoint(p0, p1, mode, t) {
        const isSelf = Math.hypot(p1.x - p0.x, p1.y - p0.y) < 0.02;
        if (isSelf) {
            const angle = t * Math.PI * 2;
            return { x: p0.x + Math.cos(angle) * 0.045, y: p0.y + Math.sin(angle) * 0.055 };
        }
        const mx = (p0.x + p1.x) * 0.5;
        let my = (p0.y + p1.y) * 0.5;
        if (mode === 'vapor') my -= 0.14;
        else if (mode === 'rain' || mode === 'snow') my -= 0.04;
        else if (mode === 'seep') my += 0.08;
        else my -= 0.07;

        const inv = 1 - t;
        return {
            x: inv * inv * p0.x + 2 * inv * t * mx + t * t * p1.x,
            y: inv * inv * p0.y + 2 * inv * t * my + t * t * p1.y
        };
    }

    function advanceOne(instant = false) {
        const choice = pickTransition(currentPool);
        const fromPool = currentPool;
        steps.push({ from: fromPool, to: choice.to, process: choice.process, driver: choice.driver, mode: choice.mode });
        elapsedDays += choice.days;
        currentPool = choice.to;

        if (!prefersReduced && !instant && jCanvas) {
            activeAnim = {
                from: fromPool,
                to: choice.to,
                mode: choice.mode,
                process: choice.process,
                progress: 0,
                duration: 0.92
            };
        } else {
            activeAnim = null;
        }
        renderJourney();
        drawJourneyScene();
    }

    function stopAuto() {
        if (autoTimer) {
            window.clearTimeout(autoTimer);
            autoTimer = null;
        }
        if (autoBtn) autoBtn.textContent = 'Auto 8-Step Trip';
    }

    function resetJourney() {
        stopAuto();
        currentPool = startSelect.value;
        steps = [];
        elapsedDays = 0;
        activeAnim = null;
        arrivalSplash = null;
        renderJourney();
        drawJourneyScene();
    }

    let jReady = false;
    const jHelper = jCanvas ? window.SimKit?.canvas2d(jCanvas, {
        box: jCanvas.parentElement,
        onResize: (_, w, h) => {
            jW = w;
            jH = h;
            if (jReady) drawJourneyScene();
        }
    }) : null;
    const jCtx = jHelper?.ctx || jCanvas?.getContext('2d');
    jReady = true;

    function drawJourneyScene() {
        if (!jCtx) return;
        const w = jW;
        const h = jH;
        jCtx.clearRect(0, 0, w, h);

        // Sky
        const sky = jCtx.createLinearGradient(0, 0, 0, h * 0.72);
        sky.addColorStop(0, '#3e9ad6');
        sky.addColorStop(1, '#d7f1fe');
        jCtx.fillStyle = sky;
        jCtx.fillRect(0, 0, w, h);

        // Sun glow
        const sunGrad = jCtx.createRadialGradient(0.14 * w, 0.16 * h, 4, 0.14 * w, 0.16 * h, 46);
        sunGrad.addColorStop(0, '#fff7cc');
        sunGrad.addColorStop(0.4, 'rgba(255, 224, 102, 0.75)');
        sunGrad.addColorStop(1, 'rgba(255, 224, 102, 0)');
        jCtx.fillStyle = sunGrad;
        jCtx.beginPath();
        jCtx.arc(0.14 * w, 0.16 * h, 46, 0, Math.PI * 2);
        jCtx.fill();

        // Distant ridges
        jCtx.fillStyle = 'rgba(104, 146, 170, 0.35)';
        jCtx.beginPath();
        jCtx.moveTo(0.28 * w, 0.68 * h);
        jCtx.lineTo(0.62 * w, 0.42 * h);
        jCtx.lineTo(0.84 * w, 0.25 * h);
        jCtx.lineTo(w, 0.36 * h);
        jCtx.lineTo(w, 0.72 * h);
        jCtx.closePath();
        jCtx.fill();

        // Land & mountain mass
        jCtx.fillStyle = '#8b7359';
        jCtx.beginPath();
        jCtx.moveTo(0.27 * w, h);
        jCtx.lineTo(0.27 * w, 0.65 * h);
        jCtx.quadraticCurveTo(0.50 * w, 0.60 * h, 0.66 * w, 0.55 * h);
        jCtx.lineTo(0.86 * w, 0.24 * h);
        jCtx.lineTo(w, 0.38 * h);
        jCtx.lineTo(w, h);
        jCtx.closePath();
        jCtx.fill();

        // Alpine glacier cap
        jCtx.fillStyle = '#f2f9fe';
        jCtx.beginPath();
        jCtx.moveTo(0.75 * w, 0.39 * h);
        jCtx.lineTo(0.86 * w, 0.24 * h);
        jCtx.lineTo(0.97 * w, 0.35 * h);
        jCtx.quadraticCurveTo(0.86 * w, 0.42 * h, 0.75 * w, 0.39 * h);
        jCtx.fill();

        // Green plain & soil layer
        jCtx.strokeStyle = '#3d8b47';
        jCtx.lineWidth = 6;
        jCtx.beginPath();
        jCtx.moveTo(0.27 * w, 0.65 * h);
        jCtx.quadraticCurveTo(0.50 * w, 0.60 * h, 0.66 * w, 0.55 * h);
        jCtx.stroke();

        jCtx.fillStyle = '#a88a63';
        jCtx.fillRect(0.27 * w, 0.69 * h, 0.73 * w, 0.31 * h);

        // Deep Aquifer
        const aqGrad = jCtx.createLinearGradient(0, 0.82 * h, 0, 0.96 * h);
        aqGrad.addColorStop(0, 'rgba(56, 168, 238, 0.82)');
        aqGrad.addColorStop(1, 'rgba(15, 76, 129, 0.94)');
        jCtx.fillStyle = aqGrad;
        jCtx.beginPath();
        jCtx.moveTo(0.27 * w, 0.78 * h);
        jCtx.quadraticCurveTo(0.60 * w, 0.80 * h, 0.94 * w, 0.78 * h);
        jCtx.lineTo(0.94 * w, 0.95 * h);
        jCtx.lineTo(0.27 * w, 0.95 * h);
        jCtx.closePath();
        jCtx.fill();

        // River & Lake (connects seamlessly into ocean edge)
        jCtx.strokeStyle = '#2d9cf2';
        jCtx.lineWidth = 5;
        jCtx.lineCap = 'round';
        jCtx.beginPath();
        jCtx.moveTo(0.79 * w, 0.38 * h);
        jCtx.quadraticCurveTo(0.71 * w, 0.51 * h, 0.66 * w, 0.56 * h);
        jCtx.quadraticCurveTo(0.48 * w, 0.62 * h, 0.25 * w, 0.65 * h);
        jCtx.stroke();

        // Ocean
        const ocGrad = jCtx.createLinearGradient(0, 0.63 * h, 0, h);
        ocGrad.addColorStop(0, '#38b6de');
        ocGrad.addColorStop(1, '#0d4c73');
        jCtx.fillStyle = ocGrad;
        jCtx.beginPath();
        jCtx.moveTo(0, h);
        jCtx.lineTo(0, 0.64 * h);
        for (let px = 0; px <= 0.28 * w; px += 10) {
            jCtx.lineTo(px, 0.64 * h + Math.sin(px * 0.05 + jTime * 2.2) * 2.2);
        }
        jCtx.lineTo(0.28 * w, h);
        jCtx.closePath();
        jCtx.fill();

        // Living Plant
        const pxPlant = POOL_POS.plant.x * w;
        const pyPlant = POOL_POS.plant.y * h + 22;
        jCtx.fillStyle = '#5c4028';
        jCtx.fillRect(pxPlant - 3, pyPlant - 24, 6, 24);
        jCtx.fillStyle = '#2c8a4b';
        jCtx.beginPath();
        jCtx.ellipse(pxPlant, pyPlant - 32, 16, 18, 0, 0, Math.PI * 2);
        jCtx.fill();
        jCtx.fillStyle = '#47ab68';
        jCtx.beginPath();
        jCtx.ellipse(pxPlant - 4, pyPlant - 36, 10, 11, 0, 0, Math.PI * 2);
        jCtx.fill();

        // Volumetric Cloud in Atmosphere
        if (window.CloudEngine?.renderCloudCluster) {
            window.CloudEngine.renderCloudCluster(jCtx, POOL_POS.atmosphere.x * w, POOL_POS.atmosphere.y * h, 145, 50, {
                darkBase: true,
                opacity: 0.92,
                time: jTime
            });
        } else {
            jCtx.fillStyle = '#ffffff';
            jCtx.beginPath();
            jCtx.ellipse(POOL_POS.atmosphere.x * w, POOL_POS.atmosphere.y * h, 52, 20, 0, 0, Math.PI * 2);
            jCtx.fill();
        }

        // Persistent branching pathway ribbons for visited hops
        steps.forEach((step, idx) => {
            const isActiveHop = activeAnim && idx === steps.length - 1;
            const p0 = POOL_POS[step.from];
            const p1 = POOL_POS[step.to];
            const ageFade = Math.max(0.24, 1 - (steps.length - 1 - idx) * 0.11);
            jCtx.save();
            jCtx.strokeStyle = `rgba(246, 201, 76, ${ageFade * 0.72})`;
            jCtx.lineWidth = isActiveHop ? 2.6 : 1.8;
            jCtx.setLineDash([5, 4]);
            jCtx.beginPath();
            const maxT = isActiveHop ? activeAnim.progress : 1;
            for (let k = 0; k <= 18; k++) {
                const pt = bezierCurvePoint(p0, p1, step.mode, (k / 18) * maxT);
                if (k === 0) jCtx.moveTo(pt.x * w, pt.y * h);
                else jCtx.lineTo(pt.x * w, pt.y * h);
            }
            jCtx.stroke();
            jCtx.restore();
        });

        // Pool anchor nodes & subtle labels
        Object.entries(POOL_POS).forEach(([id, pos]) => {
            const x = pos.x * w;
            const y = pos.y * h;
            const isCurrent = !activeAnim && currentPool === id;
            jCtx.fillStyle = isCurrent ? 'rgba(246, 201, 76, 0.92)' : 'rgba(255, 255, 255, 0.85)';
            jCtx.strokeStyle = isCurrent ? '#082c42' : 'rgba(15, 53, 72, 0.45)';
            jCtx.lineWidth = isCurrent ? 2 : 1.2;
            jCtx.beginPath();
            jCtx.arc(x, y, isCurrent ? 7 : 4.5, 0, Math.PI * 2);
            jCtx.fill();
            jCtx.stroke();

            jCtx.font = '700 10.5px system-ui, sans-serif';
            const lbl = POOL_NAMES[id].split(' & ')[0];
            jCtx.lineWidth = 3;
            jCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            jCtx.strokeText(lbl, x + 9, y + 3.5);
            jCtx.fillStyle = '#082c42';
            jCtx.fillText(lbl, x + 9, y + 3.5);
        });

        // Animated active drop with state-specific visual rendering
        const targetPos = activeAnim
            ? bezierCurvePoint(POOL_POS[activeAnim.from], POOL_POS[activeAnim.to], activeAnim.mode, activeAnim.progress)
            : POOL_POS[currentPool];
        const dx = targetPos.x * w;
        const dy = targetPos.y * h;

        jCtx.save();
        const halo = jCtx.createRadialGradient(dx, dy, 2, dx, dy, 18);
        halo.addColorStop(0, 'rgba(246, 201, 76, 0.65)');
        halo.addColorStop(1, 'rgba(246, 201, 76, 0)');
        jCtx.fillStyle = halo;
        jCtx.beginPath();
        jCtx.arc(dx, dy, 18, 0, Math.PI * 2);
        jCtx.fill();

        if (activeAnim?.mode === 'vapor') {
            jCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            jCtx.strokeStyle = '#d97706';
        } else if (activeAnim?.mode === 'snow' || currentPool === 'glacier') {
            jCtx.fillStyle = '#e0f2fe';
            jCtx.strokeStyle = '#0369a1';
        } else {
            jCtx.fillStyle = '#f6c94c';
            jCtx.strokeStyle = '#082c42';
        }
        jCtx.lineWidth = 2.2;
        jCtx.beginPath();
        jCtx.arc(dx, dy, 7.5, 0, Math.PI * 2);
        jCtx.fill();
        jCtx.stroke();
        jCtx.restore();

        // Arrival splash ring
        if (arrivalSplash) {
            const k = arrivalSplash.age / 0.45;
            jCtx.strokeStyle = `rgba(246, 201, 76, ${1 - k})`;
            jCtx.lineWidth = 2;
            jCtx.beginPath();
            jCtx.ellipse(arrivalSplash.x * w, arrivalSplash.y * h, 6 + k * 18, 3 + k * 8, 0, 0, Math.PI * 2);
            jCtx.stroke();
        }

        // HUD status bar
        jCtx.save();
        jCtx.fillStyle = 'rgba(8, 34, 52, 0.84)';
        jCtx.beginPath();
        if (jCtx.roundRect) jCtx.roundRect(10, 10, Math.min(w - 20, 395), 24, 12);
        else jCtx.rect(10, 10, Math.min(w - 20, 395), 24);
        jCtx.fill();
        jCtx.fillStyle = '#f8fafc';
        jCtx.font = '700 11px system-ui, sans-serif';
        const hudLabel = activeAnim
            ? `${activeAnim.process} → ${POOL_NAMES[activeAnim.to]}`
            : `In ${POOL_NAMES[currentPool]} · ${POOL_STATES[currentPool]} · ${formatElapsed(elapsedDays)}`;
        jCtx.fillText(hudLabel, 20, 26);
        jCtx.restore();
    }

    if (jCanvas) {
        window.SimKit?.loop((dt) => {
            const safeDt = Math.min(dt, 0.05);
            jTime += safeDt;
            if (activeAnim) {
                activeAnim.progress += safeDt / activeAnim.duration;
                if (activeAnim.progress >= 1) {
                    arrivalSplash = { x: POOL_POS[activeAnim.to].x, y: POOL_POS[activeAnim.to].y, age: 0 };
                    activeAnim = null;
                }
            }
            if (arrivalSplash) {
                arrivalSplash.age += safeDt;
                if (arrivalSplash.age >= 0.45) arrivalSplash = null;
            }
            drawJourneyScene();
        }, { el: window.SimKit?.stage(jCanvas), maxDt: 0.05 });
    }

    stepBtn.addEventListener('click', () => {
        stopAuto();
        advanceOne(false);
    });
    autoBtn?.addEventListener('click', () => {
        resetJourney();
        if (prefersReduced) {
            for (let i = 0; i < 8; i++) advanceOne(true);
            return;
        }
        let remaining = 8;
        autoBtn.textContent = 'Running trip…';
        function tickTrip() {
            if (remaining <= 0) {
                stopAuto();
                return;
            }
            advanceOne(false);
            remaining -= 1;
            if (remaining > 0) {
                autoTimer = window.setTimeout(tickTrip, 980);
            } else {
                stopAuto();
            }
        }
        tickTrip();
    });
    resetBtn?.addEventListener('click', resetJourney);
    startSelect.addEventListener('change', resetJourney);
    renderJourney();
    drawJourneyScene();
}

/* ============================================================================
   THREE-LEVEL WATER DISTRIBUTION EXPLORER (#where)
   ============================================================================ */

function initDistributionChart() {
    const canvas = document.getElementById('distribution-chart');
    const tooltip = document.getElementById('distribution-tooltip');
    const detail = document.getElementById('distribution-detail');
    const levelButtons = Array.from(document.querySelectorAll('[data-dist-level]'));
    if (!canvas) return;

    const LEVELS = [
        {
            title: 'All Earth Water',
            subtitle: '100% Global Water',
            unitLabel: "of Earth's water",
            slices: [
                {
                    label: 'Oceans', value: 96.5, color: '#0f74b8', earthPct: '96.5%', bucket: '9,650 mL',
                    desc: 'Saline ocean water stores nearly all water on Earth and drives global weather through evaporation.'
                },
                {
                    label: 'Other saline water', value: 0.9, color: '#7c6bc4', earthPct: '0.9%', bucket: '90 mL',
                    desc: 'Saline groundwater and salt lakes (such as the Great Salt Lake and Dead Sea).'
                },
                {
                    label: 'Freshwater', value: 2.5, color: '#58c5dc', earthPct: '2.5%', bucket: '250 mL', zoomTo: 1,
                    desc: 'All non-salty water on Earth — most of it is frozen in glaciers or tucked deep underground.'
                }
            ]
        },
        {
            title: 'Freshwater',
            subtitle: '2.5% of Total',
            unitLabel: 'of freshwater',
            slices: [
                {
                    label: 'Glaciers & ice caps', value: 68.7, color: '#bfe7f7', earthPct: '1.72%', bucket: '172 mL',
                    desc: 'Frozen in Antarctic & Greenland ice sheets plus mountain glaciers — the largest freshwater pool.'
                },
                {
                    label: 'Groundwater', value: 30.1, color: '#2b7cc4', earthPct: '0.75%', bucket: '75 mL',
                    desc: 'Fresh liquid water stored in underground soil pores and permeable rock aquifers.'
                },
                {
                    label: 'Surface & other', value: 1.2, color: '#0891b2', earthPct: '0.03%', bucket: '3 mL', zoomTo: 2,
                    desc: 'Permafrost, lakes, soil moisture, atmosphere, wetlands, rivers, and living things combined.'
                }
            ]
        },
        {
            title: 'Surface & Other',
            subtitle: '1.2% of Fresh',
            unitLabel: 'of surface/other fresh',
            slices: [
                {
                    label: 'Ground ice & permafrost', value: 69.0, color: '#a5c8e8', earthPct: '0.021%', bucket: '2.07 mL',
                    desc: 'Frozen ground moisture locked beneath tundra and cold high-latitude landscapes.'
                },
                {
                    label: 'Lakes', value: 20.9, color: '#1d72b8', earthPct: '0.006%', bucket: '0.63 mL',
                    desc: 'Freshwater lakes hold the majority of visible liquid surface freshwater.'
                },
                {
                    label: 'Soil moisture', value: 3.8, color: '#d49a45', earthPct: '0.0011%', bucket: '0.11 mL',
                    desc: 'Moisture clinging around soil particles that plant roots absorb.'
                },
                {
                    label: 'Atmosphere', value: 3.0, color: '#84cced', earthPct: '0.0009%', bucket: '0.09 mL',
                    desc: 'Water vapor and cloud droplets floating in Earth’s atmosphere right now.'
                },
                {
                    label: 'Swamps & marshes', value: 2.6, color: '#2f9e66', earthPct: '0.0008%', bucket: '0.08 mL',
                    desc: 'Freshwater wetlands that store floodwater and filter pollutants.'
                },
                {
                    label: 'Rivers & living things', value: 0.75, color: '#e06d53', earthPct: '0.00023%', bucket: '0.023 mL',
                    desc: 'Rivers (0.49%) plus all living organisms (0.26%) — tiny at one snapshot, yet cycling rapidly!'
                }
            ]
        }
    ];

    let levelIndex = 0;
    let selectedSliceIndex = 0;
    const bucketCanvas = document.getElementById('bucket-canvas');
    let bW = 360;
    let bH = 185;
    let bTime = 0;
    let bucketInk = window.SimKit?.theme?.colors?.().text || '#0c436b';

    let bucketReady = false;
    const bucketHelper = bucketCanvas ? window.SimKit?.canvas2d(bucketCanvas, {
        box: bucketCanvas.parentElement,
        onResize: (_, w, h) => {
            bW = w;
            bH = h;
            if (bucketReady) drawBucketScene();
        }
    }) : null;
    const bCtx = bucketHelper?.ctx || bucketCanvas?.getContext('2d');
    bucketReady = true;

    window.SimKit?.theme?.onChange?.((colors) => {
        bucketInk = colors?.text || '#0c436b';
        drawBucketScene();
    });

    function drawBucketScene() {
        if (!bCtx) return;
        const w = bW;
        const h = bH;
        const level = LEVELS[levelIndex];
        const activeSlice = level?.slices[selectedSliceIndex];
        const activeLabel = activeSlice ? activeSlice.label.toLowerCase() : '';
        bCtx.clearRect(0, 0, w, h);

        // Glass beaker dimensions on the left
        const bx = w * 0.10;
        const by = 18;
        const bw = Math.min(115, w * 0.34);
        const bh = h - 32;
        const waterTop = by + 18;
        const waterH = bh - 18;
        const slosh = Math.sin(bTime * 1.9) * 2.2;

        // Ocean 9,650 mL body (96.5%)
        const oceanH = waterH * 0.965;
        const oceanY = by + bh - oceanH;
        const ocGrad = bCtx.createLinearGradient(bx, oceanY, bx + bw, by + bh);
        ocGrad.addColorStop(0, '#1282c4');
        ocGrad.addColorStop(1, '#083f6b');
        bCtx.fillStyle = ocGrad;
        bCtx.beginPath();
        bCtx.moveTo(bx + 3, by + bh - 4);
        bCtx.lineTo(bx + 3, oceanY);
        bCtx.quadraticCurveTo(bx + bw * 0.5, oceanY + slosh, bx + bw - 3, oceanY);
        bCtx.lineTo(bx + bw - 3, by + bh - 4);
        bCtx.closePath();
        bCtx.fill();

        // Subtle saline groundwater band (90 mL)
        bCtx.fillStyle = 'rgba(124, 107, 196, 0.78)';
        bCtx.fillRect(bx + 3, oceanY - 2, bw - 6, 3);

        // Floating glacier ice cap + groundwater layer (250 mL freshwater = 2.5%)
        const freshH = Math.max(5, waterH * 0.025);
        bCtx.fillStyle = '#38bdf8';
        bCtx.fillRect(bx + 3, oceanY - 2 - freshH, bw - 6, freshH);
        // Floating crystalline glacier cubes at the top rim
        bCtx.fillStyle = 'rgba(224, 247, 255, 0.92)';
        bCtx.fillRect(bx + 10, oceanY - 6 + slosh * 0.4, 24, 6);
        bCtx.fillRect(bx + 42, oceanY - 5 - slosh * 0.4, 20, 5);

        // Glass rim, highlight & graduated mL tick marks
        bCtx.strokeStyle = 'rgba(15, 74, 114, 0.55)';
        bCtx.lineWidth = 2;
        bCtx.beginPath();
        bCtx.roundRect ? bCtx.roundRect(bx, by, bw, bh, 8) : bCtx.rect(bx, by, bw, bh);
        bCtx.stroke();

        bCtx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        bCtx.fillRect(bx + 8, by + 6, 7, bh - 12);

        bCtx.strokeStyle = 'rgba(224, 247, 255, 0.55)';
        bCtx.lineWidth = 1;
        for (let m = 1; m <= 4; m++) {
            const ty = by + bh - (waterH * m) / 5;
            bCtx.beginPath();
            bCtx.moveTo(bx + bw - 14, ty);
            bCtx.lineTo(bx + bw - 4, ty);
            bCtx.stroke();
        }

        // Highlight ring around active portion
        if (activeLabel.includes('ocean')) {
            bCtx.strokeStyle = '#f6c94c';
            bCtx.lineWidth = 2.4;
            bCtx.strokeRect(bx + 1, oceanY, bw - 2, oceanH - 1);
        } else if (activeLabel.includes('fresh') || activeLabel.includes('glacier') || activeLabel.includes('groundwater')) {
            bCtx.strokeStyle = '#f6c94c';
            bCtx.lineWidth = 2.4;
            bCtx.strokeRect(bx + 1, oceanY - 8, bw - 2, 10);
        }

        // Beaker caption (reacts live to day/night lighting)
        const isNight = document.documentElement.dataset.lighting === 'night' ||
            (!document.documentElement.dataset.lighting && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const labelInk = isNight ? '#bae6fd' : '#0c436b';
        bCtx.fillStyle = labelInk;
        bCtx.font = '700 10.5px system-ui, sans-serif';
        bCtx.fillText('10 L Total', bx + 4, by - 5);

        // Magnified dropper & ~14 accessible surface-freshwater drops on the right
        const lensX = Math.max(bx + bw + 85, w * 0.68);
        const lensY = h * 0.54;
        const lensR = Math.min(54, h * 0.30);

        // Leader dashed line from top freshwater sliver to magnified lens
        bCtx.save();
        bCtx.strokeStyle = 'rgba(8, 145, 178, 0.55)';
        bCtx.setLineDash([4, 4]);
        bCtx.lineWidth = 1.4;
        bCtx.beginPath();
        bCtx.moveTo(bx + bw, oceanY - 4);
        bCtx.lineTo(lensX - lensR, lensY - 12);
        bCtx.stroke();
        bCtx.restore();

        // Lens disc
        const lensBg = bCtx.createRadialGradient(lensX - 10, lensY - 10, 4, lensX, lensY, lensR);
        lensBg.addColorStop(0, '#ffffff');
        lensBg.addColorStop(1, '#dff4ff');
        bCtx.fillStyle = lensBg;
        bCtx.beginPath();
        bCtx.arc(lensX, lensY, lensR, 0, Math.PI * 2);
        bCtx.fill();

        bCtx.strokeStyle = (activeLabel.includes('lake') || activeLabel.includes('river') || activeLabel.includes('surface') || activeLabel.includes('swamp')) ? '#f6c94c' : '#0891b2';
        bCtx.lineWidth = 2.5;
        bCtx.stroke();

        // Glass pipette tip + 14 sparkling drops inside lens
        bCtx.fillStyle = 'rgba(148, 163, 184, 0.45)';
        bCtx.beginPath();
        bCtx.moveTo(lensX - 5, lensY - lensR + 4);
        bCtx.lineTo(lensX + 5, lensY - lensR + 4);
        bCtx.lineTo(lensX + 1.5, lensY - lensR + 20);
        bCtx.lineTo(lensX - 1.5, lensY - lensR + 20);
        bCtx.closePath();
        bCtx.fill();

        const dropPhase = (bTime * 1.4) % 1;
        for (let i = 0; i < 14; i++) {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const dx = lensX - 24 + col * 12 + (row % 2) * 5;
            const dy = lensY - 4 + row * 12 + Math.sin(bTime * 2.5 + i) * 1.2;
            const dGrad = bCtx.createRadialGradient(dx - 1, dy - 1, 0.5, dx, dy, 3.6);
            dGrad.addColorStop(0, '#e0f7ff');
            dGrad.addColorStop(1, '#0284c7');
            bCtx.fillStyle = dGrad;
            bCtx.beginPath();
            bCtx.arc(dx, dy, 3.4, 0, Math.PI * 2);
            bCtx.fill();
        }

        // Falling drop from pipette tip
        const fallY = (lensY - lensR + 22) + dropPhase * 16;
        bCtx.fillStyle = '#0ea5e9';
        bCtx.beginPath();
        bCtx.arc(lensX, fallY, 2.8, 0, Math.PI * 2);
        bCtx.fill();

        bCtx.fillStyle = labelInk;
        bCtx.font = '700 10.5px system-ui, sans-serif';
        bCtx.textAlign = 'center';
        bCtx.fillText('Lakes & rivers: ~0.7 mL (~14 drops!)', lensX, by - 5);
        bCtx.textAlign = 'left';
    }

    if (bucketCanvas) {
        window.SimKit?.loop((dt) => {
            bTime += Math.min(dt, 0.05);
            drawBucketScene();
        }, { el: window.SimKit?.stage(bucketCanvas), maxDt: 0.05 });
    }

    function renderDetail() {
        const level = LEVELS[levelIndex];
        const slice = level.slices[selectedSliceIndex] || level.slices[0];
        if (tooltip) {
            tooltip.textContent = `${slice.label}: ${slice.value}% ${level.unitLabel} (${slice.earthPct} of all Earth water).`;
        }
        drawBucketScene();
        if (!detail) return;
        detail.replaceChildren();
        const heading = document.createElement('h4');
        heading.textContent = `${slice.label} — ${slice.value}% ${level.unitLabel}`;
        const stats = document.createElement('p');
        stats.innerHTML = `<strong>Share of all Earth water:</strong> ${slice.earthPct} &nbsp;·&nbsp; <strong>In a 10 L bucket:</strong> ${slice.bucket}`;
        const desc = document.createElement('p');
        desc.textContent = slice.desc;
        detail.append(heading, stats, desc);

        if (typeof slice.zoomTo === 'number') {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sim-button';
            btn.textContent = `Zoom into ${slice.label} →`;
            btn.addEventListener('click', () => setLevel(slice.zoomTo));
            detail.appendChild(btn);
        }
    }

    function setLevel(nextLevel) {
        levelIndex = Math.max(0, Math.min(LEVELS.length - 1, nextLevel));
        selectedSliceIndex = 0;
        levelButtons.forEach((btn) => {
            const active = Number(btn.dataset.distLevel) === levelIndex;
            btn.classList.toggle('is-active', active);
            btn.classList.toggle('reset', !active);
            btn.setAttribute('aria-selected', String(active));
        });
        renderChart();
    }

    function renderChart() {
        const level = LEVELS[levelIndex];
        const legend = document.getElementById('distribution-legend');
        canvas.innerHTML = '';

        const defs = svg('defs');
        level.slices.forEach((slice, idx) => {
            const grad = svg('linearGradient', { id: `dist-grad-${levelIndex}-${idx}`, x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
            grad.appendChild(svg('stop', { offset: '0%', 'stop-color': slice.color, 'stop-opacity': '0.92' }));
            grad.appendChild(svg('stop', { offset: '100%', 'stop-color': slice.color, 'stop-opacity': '1' }));
            defs.appendChild(grad);
        });
        canvas.appendChild(defs);

        const cx = 210;
        const cy = 160;
        const radius = 108;
        let startAngle = -Math.PI / 2;
        const pendingLabels = [];

        level.slices.forEach((slice, idx) => {
            const sweep = (slice.value / 100) * Math.PI * 2;
            const endAngle = startAngle + sweep;
            const midAngle = startAngle + sweep / 2;
            const isSelected = idx === selectedSliceIndex;
            const offset = isSelected ? 6 : 0;
            const ox = Math.cos(midAngle) * offset;
            const oy = Math.sin(midAngle) * offset;

            const node = svg('path', {
                d: describeArcSlice(cx + ox, cy + oy, radius, startAngle, endAngle),
                fill: `url(#dist-grad-${levelIndex}-${idx})`,
                stroke: isSelected ? '#082c42' : '#ffffff',
                'stroke-width': isSelected ? 2.5 : 1.5,
                class: 'distribution-chart-slice',
                tabindex: 0,
                role: 'button',
                'aria-label': `${slice.label}: ${slice.value}% ${level.unitLabel}`
            });

            const selectSlice = () => {
                selectedSliceIndex = idx;
                renderChart();
            };

            node.addEventListener('mouseenter', () => {
                if (tooltip) tooltip.textContent = `${slice.label}: ${slice.value}% ${level.unitLabel} (${slice.earthPct} of all Earth water).`;
            });
            node.addEventListener('focus', selectSlice);
            node.addEventListener('click', selectSlice);
            node.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectSlice();
                }
            });
            canvas.appendChild(node);

            if (slice.value >= 12) {
                const labelRadius = radius - 26;
                const labelX = cx + ox + Math.cos(midAngle) * labelRadius;
                const labelY = cy + oy + Math.sin(midAngle) * labelRadius;
                pendingLabels.push({
                    x: labelX,
                    y: labelY,
                    label: slice.label === 'Ground ice & permafrost' ? 'Permafrost' : slice.label,
                    value: `${slice.value}%`
                });
            }

            startAngle = endAngle;
        });

        canvas.appendChild(svg('circle', { cx, cy, r: 52, fill: '#ffffff', stroke: '#cfe3f3', 'stroke-width': 1.5 }));
        canvas.appendChild(svg('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#0c436b' }, level.title));
        canvas.appendChild(svg('text', { x: cx, y: cy + 13, 'text-anchor': 'middle', 'font-size': 10, fill: '#4b6c84' }, level.subtitle));

        pendingLabels.forEach((item) => {
            canvas.appendChild(svg('text', {
                x: item.x, y: item.y, 'text-anchor': 'middle', 'font-size': 11.5, fill: '#0b2b40', 'font-weight': 700,
                'paint-order': 'stroke', stroke: '#f5fbff', 'stroke-width': 3.2
            }, item.label));
            canvas.appendChild(svg('text', {
                x: item.x, y: item.y + 14, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#1e4663', 'font-weight': 700,
                'paint-order': 'stroke', stroke: '#f5fbff', 'stroke-width': 3.2
            }, item.value));
        });

        if (legend) {
            legend.replaceChildren();
            level.slices.forEach((slice, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `wc-legend-item${idx === selectedSliceIndex ? ' is-active' : ''}`;
                btn.setAttribute('role', 'listitem');
                btn.setAttribute('aria-pressed', String(idx === selectedSliceIndex));
                btn.innerHTML = `<span class="wc-legend-swatch" style="background:${slice.color}"></span><span>${slice.label} (${slice.value}%)</span>`;
                btn.addEventListener('click', () => {
                    selectedSliceIndex = idx;
                    renderChart();
                });
                legend.appendChild(btn);
            });
        }
        renderDetail();
    }

    levelButtons.forEach((btn) => {
        btn.addEventListener('click', () => setLevel(Number(btn.dataset.distLevel)));
    });
    setLevel(0);
}

/* ============================================================================
   TRANSPIRATION EXPLORER (#transpiration-explorer — Live Biological Canvas)
   ============================================================================ */

function initTranspirationExplorer() {
    const canvas = document.getElementById('transpiration-canvas');
    if (!canvas) return;
    const root = document.getElementById('transpiration-explorer');
    const humidity = root.querySelector('#transpiration-humidity');
    const soil = root.querySelector('#transpiration-soil');
    const stomata = root.querySelector('#transpiration-stomata');

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tpRunning = !prefersReduced;
    let selectedStep = 0;
    let tpTime = 0;
    let tpW = 900;
    let tpH = 520;

    // Seeded soil grains (deterministic so zero flicker)
    const soilGrains = Array.from({ length: 48 }, (_, i) => {
        const s1 = Math.sin(i * 19.37 + 1.2) * 43758.5453;
        const s2 = Math.sin(i * 43.11 + 2.8) * 43758.5453;
        return {
            x: 16 + (s1 - Math.floor(s1)) * 260,
            y: 356 + (s2 - Math.floor(s2)) * 144,
            r: 4.5 + (i % 4) * 2.1
        };
    });

    const osmosisDrops = Array.from({ length: 12 }, (_, i) => ({
        t: (i * 0.17) % 1,
        branch: i % 4
    }));

    const leafVapor = Array.from({ length: 18 }, (_, i) => ({
        x: 660 + ((i * 29) % 110),
        y: 200 + ((i * 19) % 85),
        vx: ((i % 2 === 0 ? 1 : -1) * (12 + (i % 3) * 6)),
        vy: 14 + (i % 4) * 7,
        escaped: i < 5
    }));

    const ambientAirVapor = Array.from({ length: 24 }, (_, i) => ({
        x: 560 + ((i * 41) % 300),
        y: 345 + ((i * 23) % 125),
        vx: (i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 5),
        vy: (i % 3 === 0 ? 1 : -1) * (6 + (i % 3) * 4)
    }));

    const co2Molecules = Array.from({ length: 8 }, (_, i) => ({
        x: 590 + i * 32,
        y: 440 - (i % 3) * 24,
        phase: i * 0.9
    }));

    const explanations = [
        ['Roots · liquid water enters', 'Root hairs absorb water from moist soil films by osmosis. Connected roots deliver it to the plant’s water-carrying tissue.'],
        ['Xylem · a continuous water pathway', 'Water travels through lignified xylem vessels in roots, stems, and leaf veins. Evaporation from leaves creates tension that pulls water upward while hydrogen-bond cohesion holds the column together.'],
        ['Leaves · liquid becomes gas', 'Water evaporates from moist spongy mesophyll cell surfaces inside the leaf. Vapor diffuses through stomatal guard-cell pores into surrounding air, while CO₂ enters for photosynthesis.']
    ];

    function selectStep(index) {
        selectedStep = index;
        root.querySelectorAll('[data-transpiration-step]').forEach((button) => {
            button.setAttribute('aria-pressed', String(Number(button.dataset.transpirationStep) === index));
        });
        const panel = root.querySelector('#transpiration-explanation');
        panel.replaceChildren();
        const title = document.createElement('strong');
        title.textContent = explanations[index][0];
        const description = document.createElement('span');
        description.textContent = explanations[index][1];
        panel.append(title, description);
        drawTranspiration(0);
    }

    root.querySelectorAll('[data-transpiration-step]').forEach((button) => {
        button.addEventListener('click', () => selectStep(Number(button.dataset.transpirationStep)));
    });

    canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const lx = ((e.clientX - rect.left) / rect.width) * 900;
        if (lx < 302) selectStep(0);
        else if (lx < 528) selectStep(1);
        else selectStep(2);
    });

    let tpReady = false;
    const tpHelper = window.SimKit?.canvas2d(canvas, {
        box: canvas.parentElement,
        onResize: (_, w, h) => {
            tpW = w;
            tpH = h;
            if (tpReady) drawTranspiration(0);
        }
    });
    const ctx = tpHelper?.ctx || canvas.getContext('2d');
    tpReady = true;

    function getParams() {
        const h = Number(humidity.value);
        const water = Number(soil.value);
        const opening = Number(stomata.value);
        const rate = Math.round((1 - h / 100) * water * opening);
        return { h, water, opening, rate };
    }

    function drawTranspiration(dt) {
        if (!ctx) return;
        const { h, water, opening, rate } = getParams();
        tpTime += dt;
        const flowSpeed = rate / 100;
        const wilt = Math.max(0, (35 - water) / 35); // 0 healthy -> 1 severely wilted

        ctx.save();
        ctx.clearRect(0, 0, tpW, tpH);
        ctx.scale(tpW / 900, tpH / 520);

        // Backdrop sky reacting to outside humidity
        const sky = ctx.createLinearGradient(0, 0, 0, 520);
        sky.addColorStop(0, '#d8ecec');
        sky.addColorStop(1, '#f4f9f1');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 900, 520);

        if (h > 45) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(h - 45) / 140})`;
            ctx.fillRect(0, 0, 300, 345);
        }

        // === PANEL 1: ROOTS & LIVING PLANT (0..298) ===
        ctx.save();
        ctx.globalAlpha = selectedStep === 0 ? 1 : 0.88;

        // Soil cross-section
        const soilGrad = ctx.createLinearGradient(0, 342, 0, 520);
        soilGrad.addColorStop(0, water < 20 ? '#c4aa82' : '#9c7e54');
        soilGrad.addColorStop(1, water < 20 ? '#9c8360' : '#634c32');
        ctx.fillStyle = soilGrad;
        ctx.beginPath();
        ctx.moveTo(0, 348);
        ctx.quadraticCurveTo(145, 334, 296, 348);
        ctx.lineTo(296, 520);
        ctx.lineTo(0, 520);
        ctx.closePath();
        ctx.fill();

        // Dry drought cracks when soil <= 20%
        if (water <= 20) {
            ctx.strokeStyle = 'rgba(72, 52, 32, 0.55)';
            ctx.lineWidth = 2;
            [[48, 350, 58, 392], [218, 346, 206, 388]].forEach(([x1, y1, x2, y2]) => {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo((x1 + x2) / 2 - 4, (y1 + y2) / 2);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            });
        }

        // Soil grains + glistening blue capillary water films
        const waterAlpha = (water / 100) * 0.72;
        soilGrains.forEach((g) => {
            if (water > 5) {
                ctx.fillStyle = `rgba(56, 189, 248, ${waterAlpha})`;
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.r + 2.2 * (water / 100), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#8b6f4a';
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Root network + fine root hairs
        ctx.strokeStyle = '#7c5a38';
        ctx.lineCap = 'round';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(154, 346); ctx.quadraticCurveTo(104, 398, 48, 464);
        ctx.moveTo(154, 346); ctx.quadraticCurveTo(192, 401, 264, 472);
        ctx.moveTo(154, 352); ctx.lineTo(154, 492);
        ctx.moveTo(106, 400); ctx.lineTo(82, 484);
        ctx.moveTo(202, 417); ctx.lineTo(220, 490);
        ctx.stroke();

        // Animated osmosis droplets entering roots
        if (water > 0) {
            osmosisDrops.forEach((od) => {
                if (dt > 0) od.t = (od.t + dt * (0.2 + flowSpeed * 0.75)) % 1;
                const paths = [
                    [48, 464, 154, 346],
                    [264, 472, 154, 346],
                    [82, 484, 154, 346],
                    [220, 490, 154, 346]
                ];
                const [x1, y1, x2, y2] = paths[od.branch];
                const px = x1 + (x2 - x1) * od.t;
                const py = y1 + (y2 - y1) * od.t;
                ctx.fillStyle = `rgba(14, 165, 233, ${0.4 + (water / 100) * 0.55})`;
                ctx.beginPath();
                ctx.arc(px, py, 3.4, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Plant stem (curves slightly when wilted)
        const sway = Math.sin(tpTime * 1.4) * (1 - wilt * 0.7) * 3;
        ctx.strokeStyle = wilt > 0.5 ? '#6d7c4c' : '#4a7c44';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(154, 348);
        ctx.quadraticCurveTo(154 + wilt * 8, 240, 154 + sway + wilt * 18, 138 + wilt * 16);
        ctx.stroke();

        // Botanical veined leaves (droop physically under drought wilt!)
        const leafCol = wilt > 0.5 ? '#7ca15e' : '#3a8c56';
        const leafHighlight = wilt > 0.5 ? '#9ab878' : '#65ad6e';
        function drawPlantLeaf(bx, by, angle, len) {
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(angle + wilt * (angle < 0 ? -0.45 : 0.45));
            const lg = ctx.createLinearGradient(0, 0, len, 0);
            lg.addColorStop(0, leafCol);
            lg.addColorStop(1, leafHighlight);
            ctx.fillStyle = lg;
            ctx.strokeStyle = '#255c3c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(len * 0.48, -32, len, 0);
            ctx.quadraticCurveTo(len * 0.48, 32, 0, 0);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = 'rgba(210, 242, 198, 0.72)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(4, 0);
            ctx.lineTo(len * 0.86, 0);
            ctx.stroke();
            ctx.restore();
        }
        drawPlantLeaf(148, 260, -2.55, 108);
        drawPlantLeaf(160, 214, -0.45, 112);
        drawPlantLeaf(154 + sway * 0.5, 155 + wilt * 8, -1.68, 92);

        // Subtle vapor wisps rising from plant leaves when transpiring
        if (rate > 5) {
            ctx.strokeStyle = `rgba(19, 110, 155, ${0.15 + flowSpeed * 0.35})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const rise = (tpTime * (15 + flowSpeed * 30) + i * 16) % 45;
                const vx = 78 + i * 72 + Math.sin(tpTime * 2 + i) * 6;
                const vy = 150 - rise;
                ctx.globalAlpha = Math.max(0, 1 - rise / 45) * 0.7;
                ctx.beginPath();
                ctx.moveTo(vx, vy + 10);
                ctx.quadraticCurveTo(vx + 5, vy + 3, vx - 3, vy - 5);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = '#1b4332';
        ctx.font = '700 17px system-ui, sans-serif';
        ctx.fillText('01 · Roots absorb', 22, 34);
        ctx.font = '600 13.5px system-ui, sans-serif';
        ctx.fillStyle = '#34584b';
        ctx.fillText('Root hairs', 18, 308);
        ctx.fillText('absorb soil water', 18, 326);
        ctx.restore();

        // Dashed sightlines linking Plant -> Xylem & Leaf -> Cross-section
        ctx.save();
        ctx.strokeStyle = 'rgba(92, 128, 114, 0.65)';
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(162, 260); ctx.lineTo(312, 224);
        ctx.moveTo(255, 145); ctx.lineTo(542, 118);
        ctx.stroke();
        ctx.restore();

        // === PANEL 2: MAGNIFIED XYLEM VESSEL (310..518) ===
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = selectedStep === 1 ? '#136e9b' : '#b4cdc4';
        ctx.lineWidth = selectedStep === 1 ? 3 : 1.5;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(310, 48, 208, 440, 14) : ctx.rect(310, 48, 208, 440);
        ctx.fill();
        ctx.stroke();

        // Lignified xylem walls with helical secondary thickenings
        ctx.fillStyle = '#d9f1fa';
        ctx.fillRect(386, 134, 56, 268);
        ctx.fillStyle = '#b2956c';
        ctx.fillRect(370, 134, 16, 268);
        ctx.fillRect(442, 134, 16, 268);

        ctx.strokeStyle = '#8b6e48';
        ctx.lineWidth = 2;
        for (let py = 148; py < 395; py += 26) {
            ctx.beginPath();
            ctx.moveTo(386, py);
            ctx.lineTo(442, py - 10);
            ctx.stroke();
        }

        // Cohesive water column rising under tension
        const stepPx = 42;
        const offsetPx = rate > 0 ? (tpTime * (22 + flowSpeed * 70)) % stepPx : 0;
        const colX = 414;
        const dropletsY = [];
        for (let y = 392 - offsetPx; y >= 146; y -= stepPx) {
            dropletsY.push(y);
        }

        // Hydrogen-bond cohesion bridges between water droplets
        ctx.strokeStyle = 'rgba(19, 110, 155, 0.45)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 2.4;
        for (let i = 0; i < dropletsY.length - 1; i++) {
            ctx.beginPath();
            ctx.moveTo(colX, dropletsY[i]);
            ctx.lineTo(colX, dropletsY[i + 1]);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Droplets + adhesion menisci clinging to vessel walls
        dropletsY.forEach((dy) => {
            const dg = ctx.createRadialGradient(colX - 3, dy - 3, 1, colX, dy, 11);
            dg.addColorStop(0, '#e0f7ff');
            dg.addColorStop(0.6, '#38bdf8');
            dg.addColorStop(1, '#0369a1');
            ctx.fillStyle = dg;
            ctx.beginPath();
            ctx.arc(colX, dy, 10.5, 0, Math.PI * 2);
            ctx.fill();

            // Wall adhesion curves
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(386, dy - 6); ctx.quadraticCurveTo(395, dy, 386, dy + 6);
            ctx.moveTo(442, dy - 6); ctx.quadraticCurveTo(433, dy, 442, dy + 6);
            ctx.stroke();
        });

        // Cavitation bubbles if soil is 0% and stomata open
        if (water === 0 && opening > 0) {
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1.6;
            [220, 290, 340].forEach((cy, idx) => {
                ctx.beginPath();
                ctx.arc(colX + (idx % 2 === 0 ? -10 : 10), cy, 5, 0, Math.PI * 2);
                ctx.stroke();
            });
        }

        // Tension pull arrow
        ctx.strokeStyle = '#136e9b';
        ctx.fillStyle = '#136e9b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(414, 130);
        ctx.lineTo(414, 105);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(414, 98); ctx.lineTo(408, 109); ctx.lineTo(420, 109); ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1b4332';
        ctx.font = '700 17px system-ui, sans-serif';
        ctx.fillText('02 · Xylem pulls', 328, 80);
        ctx.font = '500 14px system-ui, sans-serif';
        ctx.fillStyle = '#34584b';
        ctx.fillText('Cohesion holds water', 328, 434);
        ctx.fillText('together under tension', 328, 456);
        ctx.restore();

        // === PANEL 3: MAGNIFIED LEAF CROSS-SECTION & STOMATA (540..884) ===
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = selectedStep === 2 ? '#136e9b' : '#b4cdc4';
        ctx.lineWidth = selectedStep === 2 ? 3 : 1.5;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(540, 48, 344, 440, 14) : ctx.rect(540, 48, 344, 440);
        ctx.fill();
        ctx.stroke();

        // Upper epidermis & waxy cuticle
        ctx.fillStyle = '#78ad70';
        ctx.strokeStyle = '#3c7950';
        ctx.lineWidth = 1.5;
        ctx.fillRect(560, 142, 304, 26);
        ctx.strokeRect(560, 142, 304, 26);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(560, 138, 304, 4);

        // Palisade mesophyll cells with chloroplasts
        for (let px = 576; px <= 848; px += 44) {
            ctx.fillStyle = '#8ec27b';
            ctx.strokeStyle = '#4e8a52';
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(px, 174, 34, 48, 8) : ctx.rect(px, 174, 34, 48);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#2d6a3e';
            [184, 198, 211].forEach((cy, ci) => {
                ctx.beginPath();
                ctx.arc(px + 11 + (ci % 2) * 12, cy, 3.2, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Spongy mesophyll cells + glistening liquid evaporation film
        const spongy = [
            [600, 260, 27, 20], [656, 254, 22, 20], [780, 256, 27, 20], [842, 260, 20, 20]
        ];
        spongy.forEach(([sx, sy, rx, ry]) => {
            if (water > 5) {
                ctx.strokeStyle = `rgba(56, 189, 248, ${0.25 + (water / 100) * 0.55})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.ellipse(sx, sy, rx + 2, ry + 2, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = '#a6c78b';
            ctx.strokeStyle = '#5e965f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // Lower epidermis flanking the stomatal pore
        const poreHalf = 11 * opening;
        const leftGuardX = 712 - poreHalf - 16;
        const rightGuardX = 712 + poreHalf + 16;
        ctx.fillStyle = '#78ad70';
        ctx.strokeStyle = '#3c7950';
        ctx.lineWidth = 1.5;
        ctx.fillRect(560, 300, leftGuardX - 560, 22);
        ctx.strokeRect(560, 300, leftGuardX - 560, 22);
        ctx.fillRect(rightGuardX, 300, 864 - rightGuardX, 22);
        ctx.strokeRect(rightGuardX, 300, 864 - rightGuardX, 22);

        // Stomatal pore opening
        if (poreHalf > 0.5) {
            ctx.fillStyle = '#153a30';
            ctx.beginPath();
            ctx.ellipse(712, 311, poreHalf + 1, 11, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Turgid / flaccid bean-shaped guard cells
        [leftGuardX, rightGuardX].forEach((gx, side) => {
            ctx.fillStyle = opening > 0 ? '#3e8d59' : '#658569';
            ctx.strokeStyle = '#1d4d31';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(gx, 311, 18, 12 + opening * 2, side === 0 ? -0.1 * opening : 0.1 * opening, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // Micro-particle physics inside substomatal air cavity & outside air
        leafVapor.forEach((vp) => {
            if (dt > 0) {
                const spd = 0.35 + flowSpeed * 1.4;
                vp.x += vp.vx * spd * dt;
                vp.y += vp.vy * spd * dt;
                if (vp.x < 670 || vp.x > 754) vp.vx *= -1;
                if (!vp.escaped) {
                    if (vp.y < 235) vp.vy = Math.abs(vp.vy);
                    if (vp.y > 296) {
                        if (opening > 0 && Math.abs(vp.x - 712) < poreHalf + 4 && rate > 0) {
                            vp.escaped = true;
                        } else {
                            vp.vy = -Math.abs(vp.vy);
                        }
                    }
                } else if (vp.y > 432) {
                    vp.escaped = false;
                    vp.x = 678 + Math.random() * 68;
                    vp.y = 248;
                }
            }
            ctx.fillStyle = water > 0 ? 'rgba(14, 165, 233, 0.85)' : 'rgba(148, 163, 184, 0.45)';
            ctx.beginPath();
            ctx.arc(vp.x, vp.y, 3.2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Outside ambient humidity vapor particles (more crowded when humidity is high!)
        const activeAmbient = Math.round((h / 100) * ambientAirVapor.length);
        for (let i = 0; i < activeAmbient; i++) {
            const av = ambientAirVapor[i];
            if (dt > 0) {
                av.x += av.vx * dt;
                av.y += av.vy * dt;
                if (av.x < 556 || av.x > 868) av.vx *= -1;
                if (av.y < 335 || av.y > 435) av.vy *= -1;
            }
            ctx.fillStyle = 'rgba(56, 189, 248, 0.48)';
            ctx.beginPath();
            ctx.arc(av.x, av.y, 2.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Tiny golden CO2 molecules diffusing inward when stomata are open
        if (opening > 0) {
            co2Molecules.forEach((cm, ci) => {
                const cycle = ((tpTime * 0.25 * opening + cm.phase) % 1);
                const cx = 712 + Math.sin(ci * 2.1 + tpTime) * (8 + (1 - cycle) * 45);
                const cy = 420 - cycle * 155;
                ctx.fillStyle = 'rgba(217, 119, 6, 0.82)';
                ctx.beginPath();
                ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        ctx.fillStyle = '#1b4332';
        ctx.font = '700 17px system-ui, sans-serif';
        ctx.fillText('03 · Leaf releases', 562, 80);
        ctx.font = '500 14px system-ui, sans-serif';
        ctx.fillStyle = '#34584b';
        ctx.fillText('Leaf cross-section · magnified', 562, 114);
        ctx.fillText('Guard cells', 564, 354);
        ctx.fillText('Evaporation inside → vapor out (CO₂ in)', 562, 464);
        ctx.restore();

        // Bottom caption strip
        ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(14, 492, 120, 22, 8);
        else ctx.rect(14, 492, 120, 22);
        ctx.fill();
        ctx.fillStyle = '#1b4332';
        ctx.font = '700 12.5px system-ui, sans-serif';
        ctx.fillText('LIQUID WATER', 24, 507);
        ctx.fillStyle = '#34584b';
        ctx.fillText('INVISIBLE VAPOR IN AIR', 602, 507);
        ctx.restore();
    }

    const tpLoop = window.SimKit?.loop((dt) => {
        if (!tpRunning) return;
        drawTranspiration(Math.min(dt, 0.05));
    }, { el: window.SimKit?.stage(canvas), maxDt: 0.05 });

    let savedFlow = null;
    function render() {
        const { h, water, opening, rate } = getParams();
        root.querySelector('#transpiration-humidity-value').textContent = `${h}%`;
        root.querySelector('#transpiration-soil-value').textContent = `${water}%`;
        root.querySelector('#transpiration-rate').textContent = `Relative flow: ${rate} / 100`;
        root.querySelector('#transpiration-meter').value = rate;

        if (savedFlow) {
            root.querySelector('#transpiration-comparison').textContent = `Saved: ${savedFlow.h}% humidity, ${savedFlow.water}% soil water, ${savedFlow.label} pores → ${savedFlow.rate}/100. Now: ${rate}/100 (${rate - savedFlow.rate > 0 ? '+' : ''}${rate - savedFlow.rate} points).`;
        }
        root.querySelector('#transpiration-feedback').textContent =
            opening === 0 ? 'Stomatal flow stops in this model. The pore is closed.' :
            water === 0 ? 'No soil water is available to sustain the modeled flow.' :
            water <= 20 ? 'Water supply limits flow. Real plants often close stomata during drought.' :
            h >= 70 ? 'Humid air reduces the difference in water vapor concentration between leaf and air.' :
            'Drier air favors vapor loss when soil water and open stomata support the flow.';
        drawTranspiration(0);
    }

    root.querySelector('#transpiration-save')?.addEventListener('click', () => {
        savedFlow = {
            h: Number(humidity.value),
            water: Number(soil.value),
            label: stomata.selectedOptions[0].textContent.toLowerCase(),
            rate: Number(root.querySelector('#transpiration-meter').value)
        };
        render();
    });

    [humidity, soil, stomata].forEach((control) => control.addEventListener('input', render));
    root.querySelectorAll('[data-transpiration-preset]').forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.transpirationPreset === 'reset') {
                savedFlow = null;
                root.querySelector('#transpiration-comparison').textContent = 'Save a baseline, change one condition, then explain the difference.';
                selectStep(0);
            }
            humidity.value = button.dataset.transpirationPreset === 'humid' ? '90' : '40';
            soil.value = button.dataset.transpirationPreset === 'drought' ? '10' : '80';
            stomata.value = button.dataset.transpirationPreset === 'drought' ? '0.35' : '1';
            render();
        });
    });

    const motionBtn = root.querySelector('#transpiration-motion');
    motionBtn?.addEventListener('click', (event) => {
        tpRunning = !tpRunning;
        event.currentTarget.setAttribute('aria-pressed', String(!tpRunning));
        event.currentTarget.textContent = tpRunning ? 'Pause flow animation' : 'Resume flow animation';
        if (tpRunning) tpLoop?.resume();
        else tpLoop?.pause();
    });

    if (!tpRunning && motionBtn) {
        motionBtn.setAttribute('aria-pressed', 'true');
        motionBtn.textContent = 'Resume flow animation';
        tpLoop?.pause();
    }

    selectStep(0);
    render();
}

/* ============================================================================
   VOCABULARY FILTER (#vocabulary)
   ============================================================================ */

function initVocabularyFilter() {
    const filterButtons = Array.from(document.querySelectorAll('[data-vocab-filter]'));
    const cards = Array.from(document.querySelectorAll('.vocab-card[data-vocab-cat]'));
    if (!filterButtons.length || !cards.length) return;

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const filter = button.dataset.vocabFilter;
            filterButtons.forEach((btn) => {
                const active = btn === button;
                btn.classList.toggle('is-active', active);
                btn.classList.toggle('reset', !active);
                btn.setAttribute('aria-pressed', String(active));
            });
            cards.forEach((card) => {
                card.hidden = filter !== 'all' && card.dataset.vocabCat !== filter;
            });
        });
    });
}

/* ============================================================================
   QUICK CHECK QUIZ (#quiz — manual Next + missed-question review)
   ============================================================================ */

function initQuiz() {
    const questions = [
        ['Under the same sun and temperature, when does water evaporate faster?', ['Into dry air', 'Into 95% humid air', 'Only at 100°C', 'Only in winter'], 0, 'Drier air has a larger moisture difference from the water surface, allowing more net evaporation.'],
        ['Which two engines work together to keep Earth’s water cycle moving?', ['Wind and ocean tides', 'Solar energy and gravity', 'Moonlight and magnetism', 'Earth’s core and rivers'], 1, 'Solar energy lifts water by heating and evaporation, while gravity pulls precipitation, runoff, and groundwater downhill.'],
        ['What happens to rising water vapor before it forms a cloud?', ['It boils at 100°C', 'It cools below its dew point and condenses', 'It freezes instantly into solid hail', 'It sinks into aquifers'], 1, 'Rising air expands and cools until it reaches its dew point (saturation), forming visible droplets or ice crystals.'],
        ['Approximately what percentage of all water on Earth is freshwater?', ['96.5%', '50%', '2.5%', '0.3%'], 2, 'About 96.5% is in the oceans (plus 0.9% other saline water), leaving only 2.5% freshwater — mostly frozen or underground.'],
        ['Which process describes water soaking down into soil pores toward an aquifer?', ['Sublimation', 'Infiltration', 'Transpiration', 'Condensation'], 1, 'Infiltration moves surface water downward through soil and rock layers into groundwater storage.'],
        ['How do plants release water vapor back into the atmosphere?', ['Transpiration through leaf stomata', 'Deposition on roots', 'Melting xylem tubes', 'Runoff through bark'], 0, 'Roots draw soil water up through xylem and release invisible vapor through microscopic leaf pores called stomata.'],
        ['What happens when snow or ice turns directly into water vapor without melting first?', ['Deposition', 'Condensation', 'Sublimation', 'Percolation'], 2, 'Sublimation skips the liquid phase (solid → gas), while deposition goes the opposite way (gas → solid).'],
        ['Why can a warmer climate cause BOTH heavier downpours and worse droughts?', ['Warm air holds more vapor before saturating and dries soils faster', 'Oceans stop evaporating when temperatures rise', 'Gravity becomes stronger during summer heat waves', 'Clouds stop condensing over continents'], 0, 'Warmer air holds ~7% more water vapor per °C, drying land between storms while feeding heavier rainfall when storms form.']
    ];

    const container = document.getElementById('quiz-questions');
    const nextBtn = document.getElementById('quiz-next-btn');
    const results = document.getElementById('quiz-results');
    const reviewList = document.getElementById('quiz-review-list');
    const scoreCounter = document.getElementById('quiz-score-counter');
    const progressLabel = document.getElementById('quiz-progress-label');
    const progressBar = document.getElementById('quiz-progress-bar');
    const scoreMessage = document.getElementById('score-message');
    const retake = document.getElementById('retake-quiz-btn');
    if (!container || !nextBtn) return;

    let current = 0;
    let score = 0;
    let locked = false;
    let missed = [];

    function updateMeta() {
        if (scoreCounter) scoreCounter.textContent = `${score}/${questions.length} correct`;
        if (progressLabel) progressLabel.textContent = current < questions.length ? `Question ${current + 1} of ${questions.length}` : 'Quiz complete';
        if (progressBar) progressBar.style.width = `${(current / questions.length) * 100}%`;
    }

    function showResults() {
        container.hidden = true;
        nextBtn.hidden = true;
        results.hidden = false;
        if (progressBar) progressBar.style.width = '100%';
        if (scoreMessage) {
            scoreMessage.textContent = score >= 7
                ? `Strong work: ${score}/${questions.length}!`
                : `You scored ${score}/${questions.length}. Review any missed items below and try again.`;
        }
        if (reviewList) {
            reviewList.replaceChildren();
            if (!missed.length) {
                const p = document.createElement('p');
                p.textContent = 'Perfect score — you mastered every water-cycle concept in this check!';
                reviewList.appendChild(p);
            } else {
                missed.forEach((item) => {
                    const div = document.createElement('div');
                    div.className = 'quiz-review-item';
                    div.innerHTML = `<strong>${item.q}</strong><br>Answer: <em>${item.a}</em> — ${item.exp}`;
                    reviewList.appendChild(div);
                });
            }
        }
    }

    function renderQuestion() {
        const [question, answers, correctIndex, explanation] = questions[current];
        container.innerHTML = '';
        nextBtn.hidden = true;
        const card = document.createElement('div');
        card.className = 'quiz-question';
        card.innerHTML = `<h3>Question ${current + 1}</h3><p>${question}</p>`;
        const options = document.createElement('div');
        options.className = 'answer-options';
        const feedback = document.createElement('p');
        feedback.className = 'distribution-tooltip';
        feedback.setAttribute('aria-live', 'polite');
        feedback.hidden = true;

        answers.forEach((answer, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'answer-btn';
            button.textContent = answer;
            button.addEventListener('click', () => {
                if (locked) return;
                locked = true;
                const correct = index === correctIndex;
                if (correct) {
                    score += 1;
                } else {
                    missed.push({ q: question, a: answers[correctIndex], exp: explanation });
                }
                [...options.children].forEach((child, childIndex) => {
                    child.disabled = true;
                    if (childIndex === correctIndex) child.classList.add('correct');
                    if (childIndex === index && !correct) child.classList.add('incorrect');
                });
                feedback.hidden = false;
                feedback.textContent = `${correct ? 'Correct.' : 'Not quite.'} ${explanation}`;
                updateMeta();
                nextBtn.textContent = current + 1 < questions.length ? 'Next Question →' : 'See Results →';
                nextBtn.hidden = false;
                nextBtn.focus();
            });
            options.appendChild(button);
        });
        card.append(options, feedback);
        container.appendChild(card);
    }

    nextBtn.addEventListener('click', () => {
        current += 1;
        locked = false;
        if (current < questions.length) {
            renderQuestion();
            updateMeta();
        } else {
            showResults();
        }
    });

    retake?.addEventListener('click', () => {
        current = 0;
        score = 0;
        locked = false;
        missed = [];
        results.hidden = true;
        container.hidden = false;
        renderQuestion();
        updateMeta();
    });

    renderQuestion();
    updateMeta();
}

/* ============================================================================
   SCAVENGER HUNT (#scavenger — flexible validation, Enter key, non-spoiling hints)
   ============================================================================ */

function initScavengerHunt() {
    const validators = [
        {
            test: (v) => includesAll(v, ['evaporat', 'condens', 'precipit', 'infiltrat', 'transpir']) && (v.includes('collect') || v.includes('runoff')),
            hint: 'Make sure you include all 6 stages: E…, C…, P…, Collection (or Runoff), I…, and T….',
            sample: 'Evaporation, condensation, precipitation, collection, infiltration, and transpiration.'
        },
        {
            test: (v) => (v.includes('sun') || v.includes('solar')) && (v.includes('gravity') || v.includes('heat') || v.includes('warm') || v.includes('energy') || v.includes('evaporat') || v.includes('drive')),
            hint: 'Name the Sun (providing heat/energy to lift vapor) and check "Two Engines" for gravity pulling water downhill!',
            sample: 'The Sun and gravity drive the cycle: solar energy heats water to drive evaporation and winds, while gravity pulls rain and runoff downhill.'
        },
        {
            test: (v) => (v.includes('96.5') || v.includes('97') || v.includes('97.5') || v.includes('96')) && (v.includes('2.5') || v.includes('3%') || v.includes('1%')),
            hint: 'Include both percentages: oceans (~96.5%–97%) and total freshwater (2.5%).',
            sample: 'Oceans hold 96.5% of Earth’s water (about 97.4% including other saltwater), and only 2.5% is freshwater.'
        },
        {
            test: (v) => (v.includes('plant') || v.includes('leaf') || v.includes('leaves') || v.includes('tree') || v.includes('stoma')) &&
                         (v.includes('ocean') || v.includes('lake') || v.includes('river') || v.includes('surface') || v.includes('water bod') || v.includes('puddle') || v.includes('soil')),
            hint: 'Mention both sources: open water surfaces (oceans/lakes) vs. plants/leaves releasing vapor.',
            sample: 'Evaporation comes from open water bodies like oceans and lakes, while transpiration comes from plants releasing vapor through leaves.'
        },
        {
            test: (v) => (v.includes('cool') || v.includes('cold') || v.includes('dew point') || v.includes('temperature drop')) &&
                         (v.includes('droplet') || v.includes('liquid') || v.includes('cloud') || v.includes('fog') || v.includes('ice')),
            hint: 'Explain what causes it (vapor cooling below its dew point) and what forms (liquid droplets or clouds).',
            sample: 'Cooling air causes invisible water vapor to condense into tiny liquid droplets or ice crystals, forming clouds and fog.'
        },
        {
            test: (v) => (v.includes('underground') || v.includes('beneath') || v.includes('soil') || v.includes('rock') || v.includes('aquifer')) &&
                         (v.includes('fresh') || v.includes('drink') || v.includes('farm') || v.includes('crop') || v.includes('slow') || v.includes('centur') || v.includes('thousand') || v.includes('replenish') || v.includes('important') || v.includes('supply')),
            hint: 'Describe where groundwater is stored (underground/soil/aquifers) AND why we must use it carefully (slow recharge / vital drinking & farm supply).',
            sample: 'Groundwater is freshwater stored underground in soil and rock aquifers; it supplies drinking water and farms, and deep aquifers can take centuries to replenish.'
        }
    ];

    const scoreCounter = document.getElementById('hunt-score-counter');
    const progressLabel = document.getElementById('hunt-progress-label');
    const progressBar = document.getElementById('hunt-progress-bar');
    const correct = new Set();

    function checkItem(index) {
        const input = document.querySelector(`.hunt-input[data-hunt="${index}"]`);
        const feedback = document.getElementById(`hunt-feedback-${index}`);
        const value = (input?.value || '').trim().toLowerCase();
        if (!value) {
            feedback.className = 'hunt-feedback incorrect';
            feedback.textContent = 'Type an answer first, or use "Reveal Relevant Section" for clues.';
            return;
        }
        const ok = validators[index].test(value);
        if (ok) correct.add(index);
        feedback.className = `hunt-feedback ${ok ? 'correct' : 'incorrect'}`;
        feedback.textContent = ok
            ? `Correct! ${validators[index].sample}`
            : `Almost — ${validators[index].hint}`;
        if (scoreCounter) scoreCounter.textContent = `${correct.size}/6 correct`;
        if (progressLabel) progressLabel.textContent = correct.size === 6 ? 'All scavenger clues solved!' : `Solved ${correct.size} of 6`;
        if (progressBar) progressBar.style.width = `${(correct.size / 6) * 100}%`;
    }

    document.querySelectorAll('[data-hunt-check]').forEach((button) => {
        button.addEventListener('click', () => checkItem(Number(button.dataset.huntCheck)));
    });

    document.querySelectorAll('.hunt-input').forEach((input) => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                checkItem(Number(input.dataset.hunt));
            }
        });
    });

    document.querySelectorAll('[data-hunt-reveal]').forEach((button) => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.huntReveal);
            const feedback = document.getElementById(`hunt-feedback-${index}`);
            if (feedback) {
                feedback.className = 'hunt-feedback';
                feedback.textContent = `Sample answer: ${validators[index].sample}`;
            }
        });
    });

    document.querySelectorAll('[data-hint-target]').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelector(button.dataset.hintTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function initContentsToggle() {
    const toggle = document.getElementById('toc-toggle');
    const toc = document.getElementById('water-cycle-toc');
    if (!toggle || !toc) return;
    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        toc.classList.toggle('is-open', !expanded);
    });
    toc.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            toggle.setAttribute('aria-expanded', 'false');
            toc.classList.remove('is-open');
        });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !toc.classList.contains('is-open')) return;
        toggle.setAttribute('aria-expanded', 'false');
        toc.classList.remove('is-open');
        toggle.focus();
    });
    document.addEventListener('pointerdown', (event) => {
        if (!toc.classList.contains('is-open') || toc.contains(event.target) || toggle.contains(event.target)) return;
        toggle.setAttribute('aria-expanded', 'false');
        toc.classList.remove('is-open');
    });
}

function initKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        if (event.target.closest('input, select, textarea, button, a')) return;
        const buttons = Array.from(document.querySelectorAll('.stage-btn'));
        const activeIndex = buttons.findIndex((button) => button.classList.contains('active'));
        if (activeIndex === -1) return;
        const next = event.key === 'ArrowRight' ? activeIndex + 1 : activeIndex - 1;
        buttons[(next + buttons.length) % buttons.length].click();
    });
}

function describeArcSlice(cx, cy, r, start, end) {
    const startX = cx + r * Math.cos(start);
    const startY = cy + r * Math.sin(start);
    const endX = cx + r * Math.cos(end);
    const endY = cy + r * Math.sin(end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`;
}

function svg(tag, attrs = {}, text = '') {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
}

function includesAll(value, parts) {
    return parts.every((part) => value.includes(part));
}
