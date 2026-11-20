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
        btnParticle: document.getElementById('wc-mode-particle')
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

    const liquidLake = window.LiquidEngine?.createSurface({
        material: 'water',
        width: 260,
        restY: 0,
        columns: 44,
        maxColumns: 64
    });

    const precipDrops = Array.from({ length: 75 }, () => ({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1,
        snow: false,
        phase: Math.random() * Math.PI * 2
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
            tag: 'Evaporating'
        };
    }

    const molecules = Array.from({ length: 24 }, (_, idx) => makeMolecule(idx));

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
        if (saved && el.comparison) {
            const change = atmo.tendency - saved.index;
            el.comparison.textContent = `Saved: ${saved.sun}% sun, ${saved.temperature}°C, ${saved.humidity}% humidity → ${saved.index}/100. Current tendency is ${change === 0 ? 'unchanged' : `${Math.abs(change)} points ${change > 0 ? 'higher' : 'lower'}`}.`;
        }
        syncPresetHighlight();
    }

    function syncCloudSim() {
        if (!wcCloudSim) return;
        const atmo = computeAtmosphere();
        const tempF = Math.round(state.temperature * 1.8 + 32);
        const dewF = Math.round(atmo.dewC * 1.8 + 32);
        wcCloudSim.setThermodynamics({ tempF, dewPointF: dewF });
        wcCloudSim.setTurbulence(0.35 + (state.sun / 100) * 0.95);
    }

    const canvasHelper = window.SimKit?.canvas2d(canvas, {
        box: diagramStage,
        onResize: (_, w, h) => {
            simW = w;
            simH = h;
            liquidLake?.configure(w * 0.34, 0, 44);
        }
    });
    const ctx = canvasHelper?.ctx || canvas.getContext('2d');

    function terrainY(x, w, h) {
        const u = x / w;
        if (u <= 0.32) return 0.70 * h;
        if (u <= 0.62) {
            const k = (u - 0.32) / 0.30;
            return (0.69 - Math.sin(k * Math.PI) * 0.03) * h;
        }
        if (u <= 0.80) {
            const k = (u - 0.62) / 0.18;
            return (0.68 - Math.pow(k, 1.2) * 0.37) * h;
        }
        const k = (u - 0.80) / 0.20;
        return (0.31 + k * 0.26) * h;
    }

    function riverPoint(t, w, h) {
        const x = (0.78 - t * 0.46) * w;
        const baseY = terrainY(x, w, h);
        return { x, y: baseY + Math.sin(t * Math.PI * 2) * 3 };
    }

    function stepParticles(dt, atmo) {
        const w = simW;
        const h = simH;
        const waterY = 0.70 * h;
        const lclNorm = Math.min(1, Math.max(0, (atmo.lclMeters - 120) / 2600));
        const lclY = (0.42 - lclNorm * 0.23) * h;

        const spawnProb = atmo.precipRate > 0 ? dt * (10 + atmo.precipRate * 38) : 0;
        for (let i = 0; i < precipDrops.length; i++) {
            const d = precipDrops[i];
            if (!d.active && Math.random() < spawnProb) {
                d.active = true;
                d.snow = atmo.precipKind === 'snow' || (atmo.precipKind === 'sleet' && i % 2 === 0);
                d.x = (0.37 + Math.random() * 0.42) * w;
                d.y = lclY + 14 + Math.random() * 10;
                d.vx = d.snow ? (Math.random() - 0.5) * 18 : -16;
                d.vy = d.snow ? 44 + Math.random() * 28 : 220 + Math.random() * 90;
                d.size = d.snow ? 2.4 + Math.random() * 2 : 1.4;
                break;
            }
        }

        for (let i = 0; i < precipDrops.length; i++) {
            const d = precipDrops[i];
            if (!d.active) continue;
            d.x += (d.vx + (d.snow ? Math.sin(simTime * 2.5 + d.phase) * 18 : 0)) * dt;
            d.y += d.vy * dt;
            const ground = Math.min(waterY, terrainY(d.x, w, h));
            if (d.y >= ground) {
                d.active = false;
            }
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
        }
    }

    function drawTree(x, groundY, scale, season, temp) {
        const trunkH = 26 * scale;
        ctx.fillStyle = '#5c4028';
        ctx.fillRect(x - 3 * scale, groundY - trunkH, 6 * scale, trunkH);

        if (season === 'Winter') {
            ctx.strokeStyle = '#5c4028';
            ctx.lineWidth = 2.2 * scale;
            ctx.beginPath();
            ctx.moveTo(x, groundY - trunkH * 0.7);
            ctx.lineTo(x - 14 * scale, groundY - trunkH * 1.25);
            ctx.moveTo(x, groundY - trunkH * 0.75);
            ctx.lineTo(x + 13 * scale, groundY - trunkH * 1.2);
            ctx.moveTo(x, groundY - trunkH);
            ctx.lineTo(x - 3 * scale, groundY - trunkH * 1.45);
            ctx.stroke();
            if (temp <= 2) {
                ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
                ctx.beginPath();
                ctx.ellipse(x - 10 * scale, groundY - trunkH * 1.22, 6 * scale, 2.5 * scale, -0.3, 0, Math.PI * 2);
                ctx.ellipse(x + 9 * scale, groundY - trunkH * 1.18, 6 * scale, 2.5 * scale, 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
            return;
        }

        const palettes = {
            Spring: ['#4eb56b', '#6ad084'],
            Summer: ['#247a45', '#34995a'],
            Fall: ['#c96420', '#e59a24']
        };
        const [darkCol, lightCol] = palettes[season] || palettes.Summer;
        ctx.fillStyle = darkCol;
        ctx.beginPath();
        ctx.ellipse(x, groundY - trunkH - 16 * scale, 20 * scale, 24 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = lightCol;
        ctx.beginPath();
        ctx.ellipse(x - 5 * scale, groundY - trunkH - 22 * scale, 13 * scale, 16 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (season === 'Spring') {
            ctx.fillStyle = '#fde2e4';
            [[-8, -18], [7, -26], [-2, -32], [9, -12]].forEach(([dx, dy]) => {
                ctx.beginPath();
                ctx.arc(x + dx * scale, groundY - trunkH + dy * scale, 2.2 * scale, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    function drawCloudBank(w, h, lclY, atmo) {
        if (state.humidity < 15) return;
        const cloudDensity = Math.min(1, (state.humidity - 15) / 85);
        const cx = 0.56 * w;
        const spread = (0.14 + cloudDensity * 0.15) * w;
        const puffScale = 0.72 + cloudDensity * 0.52;
        const darkTone = Math.round(228 - atmo.precipRate * 95);
        const midTone = Math.round(245 - atmo.precipRate * 65);
        const topTone = Math.round(255 - atmo.precipRate * 32);

        ctx.save();
        ctx.globalAlpha = 0.35 + cloudDensity * 0.62;

        // Flat condensation base (LCL)
        ctx.fillStyle = `rgb(${darkTone - 20}, ${darkTone - 12}, ${darkTone + 4})`;
        ctx.beginPath();
        ctx.ellipse(cx, lclY + 4, spread, 15 * puffScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mid cumulus lobes
        ctx.fillStyle = `rgb(${midTone - 8}, ${midTone}, ${midTone + 8})`;
        const lobes = [
            [-0.58, -6, 0.42, 24],
            [-0.22, -16, 0.46, 32],
            [0.20, -14, 0.48, 30],
            [0.58, -5, 0.38, 22]
        ];
        lobes.forEach(([ox, oy, rxFrac, ry]) => {
            ctx.beginPath();
            ctx.ellipse(cx + ox * spread, lclY + oy * puffScale, spread * rxFrac, ry * puffScale, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // Sunlit top crowns
        ctx.fillStyle = `rgb(${topTone}, ${topTone}, 255)`;
        ctx.beginPath();
        ctx.ellipse(cx - 0.15 * spread, lclY - 28 * puffScale, spread * 0.34, 24 * puffScale, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 0.18 * spread, lclY - 24 * puffScale, spread * 0.30, 21 * puffScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // LCL dashed guide line
        ctx.strokeStyle = 'rgba(14, 74, 110, 0.42)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0.35 * w, lclY + 12);
        ctx.lineTo(0.80 * w, lclY + 12);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        drawLabel(`Cloud base (LCL) ~${atmo.lclMeters.toLocaleString()} m`, 14, Math.max(20, lclY + 14));
    }

    function drawLabel(text, x, y, align = 'left') {
        ctx.save();
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = align;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(248, 252, 255, 0.9)';
        ctx.strokeText(text, x, y);
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

        ctx.clearRect(0, 0, w, h);

        // 1. Sky Gradient (responds to temperature, humidity, season)
        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
        if (atmo.precipRate > 0.35) {
            sky.addColorStop(0, '#5f7d95');
            sky.addColorStop(1, '#c3d7e4');
        } else if (atmo.T <= 0) {
            sky.addColorStop(0, '#85b3d1');
            sky.addColorStop(1, '#e6f3fa');
        } else if (atmo.T >= 29) {
            sky.addColorStop(0, '#4ca6df');
            sky.addColorStop(1, '#ffe9c6');
        } else {
            sky.addColorStop(0, '#4aa3df');
            sky.addColorStop(1, '#dff4ff');
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // 2. Sun (altitude varies by season, glow varies by sun strength)
        const sunAltMap = { Summer: 0.12, Spring: 0.15, Fall: 0.18, Winter: 0.21 };
        const sunX = 0.90 * w;
        const sunY = (sunAltMap[state.season] || 0.15) * h;
        const sunColors = { Summer: '#ffd54f', Spring: '#ffe066', Fall: '#ffb74d', Winter: '#fff0a6' };
        const sunStrength = state.sun / 100;

        if (sunStrength > 0.08) {
            const halo = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 35 + sunStrength * 55);
            halo.addColorStop(0, `rgba(255, 224, 102, ${0.45 * sunStrength})`);
            halo.addColorStop(1, 'rgba(255, 224, 102, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 35 + sunStrength * 55, 0, Math.PI * 2);
            ctx.fill();

            // Subtle solar rays toward ocean
            ctx.save();
            ctx.strokeStyle = `rgba(255, 223, 110, ${0.18 * sunStrength * (1 - atmo.precipRate * 0.65)})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            [0.14, 0.22, 0.45].forEach((targetFrac) => {
                ctx.beginPath();
                ctx.moveTo(sunX - 24, sunY + 18);
                ctx.lineTo(targetFrac * w, waterY - 12);
                ctx.stroke();
            });
            ctx.restore();
        }
        ctx.fillStyle = sunColors[state.season] || '#ffd54f';
        ctx.globalAlpha = 0.35 + sunStrength * 0.65;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 22 + sunStrength * 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // 3. Distant atmospheric haze / hills behind mountain
        ctx.fillStyle = 'rgba(130, 165, 185, 0.35)';
        ctx.beginPath();
        ctx.moveTo(0.42 * w, 0.70 * h);
        ctx.lineTo(0.64 * w, 0.44 * h);
        ctx.lineTo(0.76 * w, 0.56 * h);
        ctx.lineTo(w, 0.40 * h);
        ctx.lineTo(w, 0.72 * h);
        ctx.closePath();
        ctx.fill();

        // 4. Mountain & Coastal Terrain + Subsurface Strata
        ctx.fillStyle = atmo.T <= 0 ? '#8fa1ad' : '#8a745c';
        ctx.beginPath();
        ctx.moveTo(0.32 * w, h);
        ctx.lineTo(0.32 * w, terrainY(0.32 * w, w, h));
        for (let px = 0.33 * w; px <= w + 6; px += 8) {
            ctx.lineTo(Math.min(w, px), terrainY(Math.min(w, px), w, h));
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // Surface grass / winter snow cover along coastal plain
        ctx.strokeStyle = atmo.T <= 0 ? '#eef6fb' : state.season === 'Fall' ? '#8c9445' : '#4a8f49';
        ctx.lineWidth = 7;
        ctx.beginPath();
        for (let px = 0.32 * w; px <= 0.68 * w; px += 6) {
            const py = terrainY(px, w, h);
            if (px === 0.32 * w) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Mountain snowcap (descends dynamically below 8°C)
        const snowFrac = Math.max(0.14, Math.min(0.95, (8 - atmo.T) / 14));
        const snowLineY = (0.29 + snowFrac * 0.37) * h;
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
        ctx.fillStyle = '#f3f8fc';
        ctx.fillRect(0.60 * w, 0.24 * h, 0.42 * w, snowLineY - 0.24 * h);
        ctx.restore();

        // Subsurface porous sediment layer
        ctx.fillStyle = '#b99f79';
        ctx.beginPath();
        ctx.moveTo(0.32 * w, 0.72 * h);
        ctx.lineTo(w, 0.72 * h);
        ctx.lineTo(w, h);
        ctx.lineTo(0.32 * w, h);
        ctx.closePath();
        ctx.fill();

        // Deep Groundwater Aquifer (water table rises gently with humidity)
        const aqLift = (state.humidity / 100) * 0.03 * h;
        const aqTop = 0.84 * h - aqLift;
        const aqGrad = ctx.createLinearGradient(0, aqTop, 0, 0.96 * h);
        aqGrad.addColorStop(0, 'rgba(49, 152, 224, 0.78)');
        aqGrad.addColorStop(1, 'rgba(18, 86, 138, 0.92)');
        ctx.fillStyle = aqGrad;
        ctx.beginPath();
        ctx.moveTo(0.31 * w, waterY + 12);
        ctx.quadraticCurveTo(0.55 * w, aqTop, 0.96 * w, aqTop - 8);
        ctx.lineTo(0.96 * w, 0.95 * h);
        ctx.lineTo(0.31 * w, 0.96 * h);
        ctx.closePath();
        ctx.fill();

        // River flowing from mountain down to ocean
        ctx.strokeStyle = atmo.T <= -4 ? '#bde3f7' : '#2f9df4';
        ctx.lineWidth = 4.5 + atmo.precipRate * 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
            const pt = riverPoint(i / 24, w, h);
            if (i === 0) ctx.moveTo(pt.x, pt.y + 1);
            else ctx.lineTo(pt.x, pt.y + 1);
        }
        ctx.stroke();

        // 5. Ocean / Lake with LiquidEngine surface waves + ice cover below 0°C
        const lakeGrad = ctx.createLinearGradient(0, waterY, 0, h);
        lakeGrad.addColorStop(0, '#3bb5d8');
        lakeGrad.addColorStop(1, '#104968');
        ctx.fillStyle = lakeGrad;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, waterY);
        if (liquidLake) {
            const waveScale = atmo.T <= 0 ? 0.15 : 1;
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

        // Surface ripple highlight
        ctx.strokeStyle = 'rgba(220, 247, 255, 0.72)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (liquidLake) {
            const waveScale = atmo.T <= 0 ? 0.15 : 1;
            liquidLake.columns.forEach((col, idx) => {
                const lx = (idx / (liquidLake.columns.length - 1)) * 0.34 * w;
                const ly = waterY + col.y * waveScale;
                if (idx === 0) ctx.moveTo(lx, ly);
                else ctx.lineTo(lx, ly);
            });
        }
        ctx.stroke();

        // Ice crust when freezing
        if (atmo.T <= 0) {
            const iceThick = Math.min(14, 4 + Math.abs(atmo.T) * 1.0);
            ctx.fillStyle = 'rgba(224, 247, 255, 0.88)';
            ctx.fillRect(0, waterY - 2, 0.33 * w, iceThick);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, waterY - 2);
            ctx.lineTo(0.33 * w, waterY - 2);
            ctx.stroke();
        }

        // 6. Seasonal Trees (coastal valley)
        drawTree(0.41 * w, terrainY(0.41 * w, w, h), 0.92, state.season, atmo.T);
        drawTree(0.47 * w, terrainY(0.47 * w, w, h), 1.12, state.season, atmo.T);
        drawTree(0.53 * w, terrainY(0.53 * w, w, h), 0.85, state.season, atmo.T);

        // 7. Clouds at LCL
        drawCloudBank(w, h, lclY, atmo);

        // 8. Precipitation under clouds
        for (let i = 0; i < precipDrops.length; i++) {
            const d = precipDrops[i];
            if (!d.active) continue;
            if (d.snow) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.strokeStyle = 'rgba(220, 245, 255, 0.85)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - 2, d.y + 9);
                ctx.stroke();
            }
        }

        // 9. Labels
        drawLabel(atmo.T <= 0 ? 'Frozen Ocean / Lake' : 'Ocean / Lake', 18, h - 18);
        drawLabel('Evaporation ↑', 0.14 * w, 0.57 * h);
        drawLabel('Transpiration ↑', 0.42 * w, 0.53 * h);
        drawLabel('Runoff ↓', 0.62 * w, 0.52 * h);
        drawLabel('Groundwater Aquifer', 0.47 * w, 0.91 * h);

        // 10. Branching water-cycle molecules
        for (let i = molecules.length - 1; i >= 0; i--) {
            const m = molecules[i];
            const isVapor = m.phase === 'evaporate' || m.phase === 'transpire' || m.phase === 'cloud';
            const isIce = m.tag === 'Snowing';
            const isTracked = state.trackDrop && i === 0;

            if (isTracked) {
                ctx.save();
                ctx.fillStyle = 'rgba(246, 201, 76, 0.35)';
                ctx.beginPath();
                ctx.arc(m.x, m.y, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.fillStyle = isTracked ? '#f6c94c' : isIce ? '#e0f2fe' : isVapor ? '#ffffff' : '#1e90ff';
            ctx.strokeStyle = isTracked ? '#082c42' : '#0a4a79';
            ctx.lineWidth = isTracked ? 2.2 : 1.3;
            ctx.beginPath();
            ctx.arc(m.x, m.y, isTracked ? 6.5 : 4.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            if (isTracked) {
                ctx.save();
                ctx.font = '700 11px system-ui, sans-serif';
                const labelText = m.tag;
                const tw = ctx.measureText(labelText).width;
                const bx = Math.min(w - tw - 18, Math.max(8, m.x + 10));
                const by = Math.max(20, m.y - 10);
                ctx.fillStyle = 'rgba(8, 44, 66, 0.9)';
                ctx.beginPath();
                ctx.roundRect(bx - 6, by - 12, tw + 12, 18, 9);
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
        if (liquidLake && Math.random() < safeDt * (atmo.T <= 0 ? 0.1 : 0.7 + atmo.precipRate)) {
            liquidLake.impulse(40 + Math.random() * (simW * 0.24), -8 - atmo.precipRate * 8, 24);
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

            if (!wcCloudSim && window.CloudEngine) {
                wcCloudSim = window.CloudEngine.attach('wc-particle-canvas', {
                    preset: 'water_cycle_evaporation',
                    showLCL: true,
                    showAltitudeGuide: true,
                    interactive: true
                });
            } else if (wcCloudSim?.simKitHelper?.resize) {
                wcCloudSim.simKitHelper.resize();
            }
            syncCloudSim();
            syncEnginePlayback();
        });
    }

    if (!state.playing && el.toggle) el.toggle.textContent = 'Resume Cycle';
    el.toggle?.setAttribute('aria-pressed', String(state.playing));
    updateReadouts();
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
    let themeColors = window.SimKit?.theme?.colors?.() || { text: '#1d1d1f', textMuted: '#6e6e73', accent: '#0071e3' };

    // Hexagonal lattice targets (open rings) for ice below 0°C
    const hexPts = [
        [0.24, 0.42], [0.36, 0.34], [0.48, 0.42], [0.48, 0.57], [0.36, 0.65], [0.24, 0.57],
        [0.60, 0.34], [0.72, 0.42], [0.72, 0.57], [0.60, 0.65],
        [0.24, 0.74], [0.36, 0.82], [0.48, 0.74], [0.60, 0.82], [0.72, 0.74],
        [0.14, 0.50], [0.82, 0.50], [0.48, 0.22]
    ];

    const h2o = Array.from({ length: 18 }, (_, i) => ({
        x: (0.18 + (i % 6) * 0.13) * 360,
        y: (0.48 + Math.floor(i / 6) * 0.16) * 240,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        angle: Math.random() * Math.PI * 2,
        omega: (Math.random() - 0.5) * 2.4,
        vaporTimer: 0,
        evaporating: i < 2
    }));

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

        // Evaporation Zone highlight (0°C to 100°C)
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
        }, 'vapor escapes liquid at any temp'));

        // Grid lines at 0°C and 100°C
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

        // Axes
        curveSvg.appendChild(svg('line', { x1: x0, y1: yTop, x2: x0, y2: yBot, stroke: ink, 'stroke-width': 2 }));
        curveSvg.appendChild(svg('line', { x1: x0, y1: yBot, x2: x1, y2: yBot, stroke: ink, 'stroke-width': 2 }));
        curveSvg.appendChild(svg('text', { x: (x0 + x1) / 2, y: 296, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: ink }, 'Thermal Energy Added →'));
        curveSvg.appendChild(svg('text', { x: 18, y: (yTop + yBot) / 2, transform: `rotate(-90 18 ${(yTop + yBot) / 2})`, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: ink }, 'Temp (°C)'));

        // Curve coordinates
        const pStart = [x0 + 18, toY(-25)];
        const pMeltA = [x0 + 88, toY(0)];
        const pMeltB = [x0 + 168, toY(0)];
        const pBoilA = [x0 + 338, toY(100)];
        const pBoilB = [x0 + 468, toY(100)];
        const pEnd = [x0 + 528, toY(125)];

        const d = `M ${pStart[0]} ${pStart[1]} L ${pMeltA[0]} ${pMeltA[1]} L ${pMeltB[0]} ${pMeltB[1]} L ${pBoilA[0]} ${pBoilA[1]} L ${pBoilB[0]} ${pBoilB[1]} L ${pEnd[0]} ${pEnd[1]}`;
        curveSvg.appendChild(svg('path', { d, fill: 'none', stroke: accent, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

        // Labels along curve segments
        curveSvg.appendChild(svg('text', { x: x0 + 38, y: toY(-15), 'font-size': 11, 'font-weight': 700, fill: ink }, 'Ice'));
        curveSvg.appendChild(svg('text', { x: (pMeltA[0] + pMeltB[0]) / 2, y: toY(0) + 17, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: muted }, 'Melt ↔ Freeze'));
        curveSvg.appendChild(svg('text', { x: (pMeltB[0] + pBoilA[0]) / 2 + 12, y: toY(52), 'font-size': 12, 'font-weight': 700, fill: ink }, 'Liquid Water'));
        curveSvg.appendChild(svg('text', { x: (pBoilA[0] + pBoilB[0]) / 2, y: toY(100) - 10, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: muted }, 'Boil ↔ Condense'));
        curveSvg.appendChild(svg('text', { x: x0 + 522, y: toY(112), 'font-size': 11, 'font-weight': 700, fill: ink }, 'Vapor'));

        // Sublimation ↔ Deposition arc in open lower-right area
        curveSvg.appendChild(svg('path', {
            d: `M ${x0 + 70} ${toY(-8)} Q ${x0 + 380} ${toY(-6)} ${x0 + 510} ${toY(106)}`,
            fill: 'none', stroke: '#d97706', 'stroke-width': 2, 'stroke-dasharray': '5 5'
        }));
        curveSvg.appendChild(svg('text', {
            x: x0 + 390, y: toY(18), 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#b45309'
        }, 'Sublimation ↔ Deposition (skips liquid)'));

        // Active temperature point on heating curve
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

        curveSvg.appendChild(svg('circle', { cx: mx, cy: my, r: 11, fill: 'rgba(246, 201, 76, 0.38)' }));
        curveSvg.appendChild(svg('circle', { cx: mx, cy: my, r: 6, fill: '#f6c94c', stroke: '#082c42', 'stroke-width': 2 }));
    }

    function drawH2OMolecule(ctx, x, y, angle, scale = 1, isVapor = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const rO = 7.2 * scale;
        const rH = 4.2 * scale;
        const bond = 9.5 * scale;
        const halfAngle = (104.5 / 2) * (Math.PI / 180);

        const h1x = Math.cos(-halfAngle) * bond;
        const h1y = Math.sin(-halfAngle) * bond;
        const h2x = Math.cos(halfAngle) * bond;
        const h2y = Math.sin(halfAngle) * bond;

        ctx.strokeStyle = 'rgba(226, 244, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(h1x, h1y);
        ctx.moveTo(0, 0);
        ctx.lineTo(h2x, h2y);
        ctx.stroke();

        ctx.fillStyle = isVapor ? '#7dd3fc' : '#0284c7';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, rO, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(h1x, h1y, rH, 0, Math.PI * 2);
        ctx.arc(h2x, h2y, rH, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    const molHelper = window.SimKit?.canvas2d(molCanvas, {
        box: molCanvas.parentElement,
        onResize: (_, w, h) => {
            molW = w;
            molH = h;
        }
    });
    const mCtx = molHelper?.ctx || molCanvas.getContext('2d');

    function renderMolecules(dt) {
        const w = molW;
        const h = molH;
        mCtx.clearRect(0, 0, w, h);

        const bg = mCtx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#0b1e2e');
        bg.addColorStop(1, '#102d42');
        mCtx.fillStyle = bg;
        mCtx.fillRect(0, 0, w, h);

        const surfaceY = 0.44 * h;

        if (tempC > 0 && tempC < 100) {
            mCtx.fillStyle = 'rgba(14, 116, 174, 0.25)';
            mCtx.fillRect(0, surfaceY, w, h - surfaceY);
            mCtx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
            mCtx.lineWidth = 1.5;
            mCtx.beginPath();
            mCtx.moveTo(0, surfaceY);
            mCtx.lineTo(w, surfaceY);
            mCtx.stroke();
            mCtx.fillStyle = 'rgba(224, 242, 254, 0.72)';
            mCtx.font = '600 11px system-ui, sans-serif';
            mCtx.fillText('Surface evaporation (vapor)', 10, 18);
            mCtx.fillText('Liquid water', 10, surfaceY + 18);
        } else if (tempC <= 0) {
            mCtx.fillStyle = 'rgba(224, 242, 254, 0.78)';
            mCtx.font = '600 11px system-ui, sans-serif';
            mCtx.fillText(tempC === 0 ? 'Melting crystal lattice (0°C)' : 'Open hexagonal ice crystal', 10, 18);
        } else {
            mCtx.fillStyle = 'rgba(224, 242, 254, 0.8)';
            mCtx.font = '600 11px system-ui, sans-serif';
            mCtx.fillText('Water vapor gas (high kinetic energy)', 10, 18);
        }

        const speedBoost = 0.4 + Math.max(0, (tempC + 25) / 150) * 1.8;
        const vaporSlots = tempC <= 0 ? 0 : tempC >= 100 ? h2o.length : 1 + Math.floor((tempC / 100) * 4);

        if (tempC < 0) {
            // Draw faint hydrogen-bond lattice lines between nearby crystal nodes
            mCtx.save();
            mCtx.strokeStyle = 'rgba(147, 197, 253, 0.35)';
            mCtx.setLineDash([4, 4]);
            mCtx.lineWidth = 1.2;
            const ringPairs = [
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
                [2, 6], [6, 7], [7, 8], [8, 9], [9, 3],
                [5, 10], [10, 11], [11, 12], [12, 3], [12, 13], [13, 14], [14, 9]
            ];
            ringPairs.forEach(([a, b]) => {
                mCtx.beginPath();
                mCtx.moveTo(hexPts[a][0] * w, hexPts[a][1] * h);
                mCtx.lineTo(hexPts[b][0] * w, hexPts[b][1] * h);
                mCtx.stroke();
            });
            mCtx.restore();
        }

        h2o.forEach((p, idx) => {
            if (tempC <= 0) {
                const targetX = hexPts[idx][0] * w;
                const targetY = hexPts[idx][1] * h;
                const amp = tempC === 0 ? 4.8 : 1.2 + ((tempC + 25) / 25) * 1.8;
                p.x = targetX + Math.sin(performance.now() * 0.015 + idx * 1.7) * amp;
                p.y = targetY + Math.cos(performance.now() * 0.017 + idx * 2.1) * amp;
                if (tempC === 0 && idx < 4) {
                    p.y -= 6 + Math.sin(performance.now() * 0.005 + idx) * 6;
                }
                p.angle = (idx % 6) * (Math.PI / 3);
            } else {
                const isVapor = idx < vaporSlots;
                const minY = isVapor ? 24 : surfaceY + 14;
                const maxY = isVapor ? (tempC >= 100 ? h - 18 : surfaceY - 12) : h - 18;
                if (dt > 0) {
                    const velScale = (isVapor ? 1.55 : 0.72) * speedBoost;
                    p.x += p.vx * velScale * dt;
                    p.y += p.vy * velScale * dt;
                    p.angle += p.omega * speedBoost * dt;
                    if (p.x < 18) { p.x = 18; p.vx = Math.abs(p.vx); }
                    if (p.x > w - 18) { p.x = w - 18; p.vx = -Math.abs(p.vx); }
                    if (p.y < minY) { p.y = minY; p.vy = Math.abs(p.vy); }
                    if (p.y > maxY) { p.y = maxY; p.vy = -Math.abs(p.vy); }
                }
            }
            drawH2OMolecule(mCtx, p.x, p.y, p.angle, 0.92, tempC >= 100 || (tempC > 0 && idx < vaporSlots));
        });
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
            note = 'At 0°C, added thermal energy breaks crystal bonds without raising temperature until all ice melts.';
        } else if (tempC < 100) {
            badge = tempC >= 30 ? 'Warm Liquid · Fast Evaporation' : 'Liquid · Water';
            note = `At ${tempC}°C, liquid molecules flow freely in the lower pool while ${1 + Math.floor((tempC / 100) * 4)} high-energy molecules escape into the air as vapor.`;
        } else if (tempC === 100) {
            badge = 'Boiling / Condensing · 100°C';
            note = 'At 100°C (sea level), thermal energy turns liquid into vapor throughout the entire volume, not just the surface.';
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
    if (!startSelect || !stepBtn || !trail) return;

    const POOL_NAMES = {
        ocean: 'Ocean',
        atmosphere: 'Atmosphere',
        glacier: 'Glacier & Snowpack',
        river: 'River & Lake',
        soil: 'Soil Moisture',
        plant: 'Living Plant',
        groundwater: 'Groundwater Aquifer'
    };

    const TRANSITIONS = {
        ocean: [
            { to: 'atmosphere', process: 'Evaporation', driver: '☀️ Solar heat', weight: 0.65 },
            { to: 'ocean', process: 'Circulates in ocean currents', driver: '☀️ Wind & currents', weight: 0.35 }
        ],
        atmosphere: [
            { to: 'ocean', process: 'Precipitation over sea', driver: '⬇️ Gravity', weight: 0.45 },
            { to: 'river', process: 'Rain onto streams/lakes', driver: '⬇️ Gravity', weight: 0.25 },
            { to: 'soil', process: 'Rain soaking topsoil', driver: '⬇️ Gravity', weight: 0.18 },
            { to: 'glacier', process: 'Snowfall on high peaks', driver: '⬇️ Gravity', weight: 0.12 }
        ],
        glacier: [
            { to: 'river', process: 'Spring snowmelt runoff', driver: '☀️ Melt + ⬇️ Gravity', weight: 0.72 },
            { to: 'atmosphere', process: 'Sublimation into dry air', driver: '☀️ Solar energy', weight: 0.28 }
        ],
        river: [
            { to: 'ocean', process: 'Streamflow to coast', driver: '⬇️ Gravity', weight: 0.55 },
            { to: 'atmosphere', process: 'Surface evaporation', driver: '☀️ Solar energy', weight: 0.25 },
            { to: 'soil', process: 'Riverbank seepage', driver: '⬇️ Gravity', weight: 0.20 }
        ],
        soil: [
            { to: 'plant', process: 'Root absorption', driver: '🌱 Osmosis & xylem pull', weight: 0.36 },
            { to: 'groundwater', process: 'Deep percolation', driver: '⬇️ Gravity', weight: 0.34 },
            { to: 'atmosphere', process: 'Soil evaporation', driver: '☀️ Solar energy', weight: 0.30 }
        ],
        plant: [
            { to: 'atmosphere', process: 'Transpiration through stomata', driver: '☀️ Solar energy', weight: 1.0 }
        ],
        groundwater: [
            { to: 'river', process: 'Spring discharge to stream', driver: '⬇️ Gravity & pressure', weight: 0.45 },
            { to: 'ocean', process: 'Submarine coastal discharge', driver: '⬇️ Gravity', weight: 0.30 },
            { to: 'groundwater', process: 'Stored slowly in aquifer', driver: '⬇️ Deep rock pores', weight: 0.25 }
        ]
    };

    let currentPool = startSelect.value;
    let steps = [];

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
        if (currentPill) currentPill.textContent = `Step ${steps.length} · In ${label}`;

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
            reflection.textContent = `After ${steps.length} step${steps.length === 1 ? '' : 's'}, this drop visited ${visited.size} unique pool${visited.size === 1 ? '' : 's'} — proving real water cycles through branching shortcuts rather than one fixed circle.`;
        }
    }

    function advanceOne() {
        const choice = pickTransition(currentPool);
        steps.push({ from: currentPool, to: choice.to, process: choice.process, driver: choice.driver });
        currentPool = choice.to;
        renderJourney();
    }

    function resetJourney() {
        currentPool = startSelect.value;
        steps = [];
        renderJourney();
    }

    stepBtn.addEventListener('click', advanceOne);
    autoBtn?.addEventListener('click', () => {
        resetJourney();
        for (let i = 0; i < 8; i++) advanceOne();
    });
    resetBtn?.addEventListener('click', resetJourney);
    startSelect.addEventListener('change', resetJourney);
    renderJourney();
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

    function renderDetail() {
        const level = LEVELS[levelIndex];
        const slice = level.slices[selectedSliceIndex] || level.slices[0];
        if (tooltip) {
            tooltip.textContent = `${slice.label}: ${slice.value}% ${level.unitLabel} (${slice.earthPct} of all Earth water).`;
        }
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
                fill: slice.color,
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
   TRANSPIRATION EXPLORER (#transpiration-explorer)
   ============================================================================ */

function initTranspirationExplorer() {
    const canvas = document.getElementById('transpiration-canvas');
    if (!canvas) return;
    const root = document.getElementById('transpiration-explorer');
    const humidity = root.querySelector('#transpiration-humidity');
    const soil = root.querySelector('#transpiration-soil');
    const stomata = root.querySelector('#transpiration-stomata');

    canvas.innerHTML = `<title id="transpiration-title">Inside a plant: the transpiration pathway</title>
        <desc id="transpiration-desc">A rooted plant connects to a magnified xylem tube and a leaf cross-section. Liquid water enters roots, rises through xylem, evaporates inside the leaf, and diffuses out through a stomatal pore.</desc>
        <defs>
          <linearGradient id="tp-sky" x2="0" y2="1"><stop stop-color="#e0eff0"/><stop offset="1" stop-color="#f7faf4"/></linearGradient>
          <linearGradient id="tp-leaf"><stop stop-color="#276e4d"/><stop offset=".5" stop-color="#65a86c"/><stop offset="1" stop-color="#3d8056"/></linearGradient>
          <pattern id="tp-soil" width="44" height="28" patternUnits="userSpaceOnUse"><rect width="44" height="28" fill="#d6bf98"/><path d="M0 9q11 -4 22 0t22 0M6 22h5m20 -3h4" stroke="#aa8d62" fill="none" opacity=".5"/></pattern>
          <marker id="tp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#136e9b"/></marker>
        </defs>
        <rect width="900" height="520" rx="16" fill="url(#tp-sky)"/>
        <g data-tp-region="0" tabindex="0" role="button" aria-label="Step 1: Roots absorb soil water">
          <path d="M0 347Q135 334 292 347V520H0Z" fill="url(#tp-soil)"/>
          <path d="M155 348V139" stroke="#8d6945" stroke-width="22" stroke-linecap="round"/>
          <g fill="url(#tp-leaf)" stroke="#276447" stroke-width="2">
            <path d="M153 266Q53 249 47 160Q140 158 153 266Z"/><path d="M158 220Q174 111 267 119Q268 199 158 220Z"/><path d="M155 168Q98 113 135 57Q194 101 155 168Z"/>
          </g>
          <g stroke="#add1a0" fill="none" stroke-width="2"><path d="M151 258L66 179m32 25l-5 -27m29 48l-2 -28M162 215L249 135m-48 44l29 -3m-51 23l5 -32M155 156L138 78"/></g>
          <path d="M155 346Q105 398 48 460M155 346Q192 401 267 469M155 354V492M106 400L83 484M201 417L219 491" stroke="#8d6945" stroke-width="7" fill="none" stroke-linecap="round"/>
          <g stroke="#8d6945" stroke-width="1.5"><path d="M67 441l-19 -2m26 -8l-5 -14m41 41l15 11m117 -21l17 -3m-65 -31l-3 16m-30 36l-12 9m9 -29l12 6"/></g>
          <g id="transpiration-soil-drops" fill="#329dc5" opacity=".75"><circle cx="39" cy="421" r="5"/><circle cx="95" cy="480" r="5"/><circle cx="244" cy="439" r="5"/><circle cx="180" cy="475" r="5"/><circle cx="62" cy="390" r="4"/><circle cx="215" cy="392" r="4"/></g>
          <text x="24" y="32" class="tp-title">01 · Roots absorb</text><text x="24" y="320" class="tp-small">Root hairs contact soil water</text>
        </g>
        <path d="M168 260L315 225M257 145L561 121" stroke="#81978d" stroke-dasharray="4 5" fill="none"/>
        <g data-tp-region="1" tabindex="0" role="button" aria-label="Step 2: Xylem pulls water upward">
          <rect x="311" y="51" width="206" height="437" rx="14" fill="#fff" stroke="#b4cdc4"/>
          <text x="330" y="83" class="tp-title">02 · Xylem pulls</text>
          <path d="M373 139V400M452 139V400" stroke="#b2956c" stroke-width="13"/>
          <path d="M389 139V400H437V139Z" fill="#d9f1fa"/>
          <g fill="#59b4d8" stroke="#16749b" stroke-width="1.5"><circle cx="413" cy="179" r="11"/><circle cx="413" cy="220" r="11"/><circle cx="413" cy="261" r="11"/><circle cx="413" cy="302" r="11"/><circle cx="413" cy="343" r="11"/></g>
          <path id="transpiration-xylem" stroke-dasharray="8 10" d="M413 344V152" stroke="#136e9b" stroke-width="3" fill="none" marker-end="url(#tp-arrow)"/>
          <text x="329" y="435" class="tp-small">Cohesion holds water</text><text x="329" y="457" class="tp-small">together under tension</text>
        </g>
        <g data-tp-region="2" tabindex="0" role="button" aria-label="Step 3: Leaf releases water vapor">
          <rect x="546" y="51" width="336" height="437" rx="14" fill="#fff" stroke="#b4cdc4"/>
          <text x="565" y="83" class="tp-title">03 · Leaf releases</text>
          <text x="565" y="115" class="tp-small">Leaf cross-section · magnified</text>
          <path d="M563 143H865V170H563ZM563 301H681V323H563ZM749 301H865V323H749Z" fill="#78ad70" stroke="#3c7950"/>
          <g fill="#a6c78b" stroke="#5e965f" stroke-width="2"><ellipse cx="593" cy="204" rx="23" ry="25"/><ellipse cx="649" cy="205" rx="23" ry="25"/><ellipse cx="711" cy="204" rx="23" ry="25"/><ellipse cx="775" cy="206" rx="23" ry="25"/><ellipse cx="840" cy="203" rx="20" ry="25"/><ellipse cx="605" cy="260" rx="29" ry="20"/><ellipse cx="668" cy="258" rx="22" ry="21"/><ellipse cx="789" cy="258" rx="29" ry="20"/><ellipse cx="849" cy="260" rx="18" ry="20"/></g>
          <path d="M675 230Q714 253 739 279" fill="none" stroke="#329dc5" stroke-width="4"/>
          <text x="572" y="354" class="tp-small">Guard cells</text><path d="M650 348L690 315" stroke="#58766a" fill="none"/>
          <ellipse id="transpiration-guard-left" cx="692" cy="309" rx="19" ry="13" fill="#3e8d59"/><ellipse id="transpiration-guard-right" cx="738" cy="309" rx="19" ry="13" fill="#3e8d59"/>
          <ellipse id="transpiration-pore" cx="715" cy="309" rx="10" ry="10" fill="#173f35"/>
          <path id="transpiration-vapor" d="M715 282V414M725 335L764 413M704 336L669 413" stroke="#136e9b" stroke-width="3" stroke-dasharray="3 9" fill="none" marker-end="url(#tp-arrow)"/>
          <text x="567" y="452" class="tp-small">Evaporation inside → diffusion out</text>
        </g>
        <path id="transpiration-liquid" d="M48 460Q106 400 155 346V220Q210 173 250 138" fill="none" stroke="#136e9b" stroke-width="4" stroke-dasharray="8 10"/>
        <text x="24" y="507" class="tp-small">LIQUID WATER</text><text x="594" y="507" class="tp-small">INVISIBLE VAPOR IN AIR</text>`;

    const explanations = [
        ['Roots · liquid water enters', 'Root hairs absorb water from soil. Connected roots deliver it to the plant’s water-carrying tissue.'],
        ['Xylem · a continuous water pathway', 'Water travels through xylem in roots, stems, and leaf veins. Evaporation from leaves creates tension that pulls water upward; cohesion helps hold the water column together.'],
        ['Leaves · liquid becomes gas', 'Water evaporates from moist cell surfaces inside the leaf. Vapor then diffuses through stomata into the surrounding air. Water vapor is invisible, unlike mist droplets.']
    ];

    function selectStep(index) {
        root.querySelectorAll('[data-transpiration-step]').forEach((button) => {
            button.setAttribute('aria-pressed', String(Number(button.dataset.transpirationStep) === index));
        });
        canvas.querySelectorAll('[data-tp-region]').forEach((region) => {
            region.classList.toggle('tp-selected', Number(region.dataset.tpRegion) === index);
        });
        const panel = root.querySelector('#transpiration-explanation');
        panel.replaceChildren();
        const title = document.createElement('strong');
        title.textContent = explanations[index][0];
        const description = document.createElement('span');
        description.textContent = explanations[index][1];
        panel.append(title, description);
    }

    root.querySelectorAll('[data-transpiration-step]').forEach((button) => {
        button.addEventListener('click', () => selectStep(Number(button.dataset.transpirationStep)));
    });
    canvas.querySelectorAll('[data-tp-region]').forEach((region) => {
        region.addEventListener('click', () => selectStep(Number(region.dataset.tpRegion)));
        region.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectStep(Number(region.dataset.tpRegion));
            }
        });
    });

    let savedFlow = null;
    function render() {
        const h = Number(humidity.value);
        const water = Number(soil.value);
        const opening = Number(stomata.value);
        const rate = Math.round((1 - h / 100) * water * opening);
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

        canvas.querySelector('#transpiration-pore')?.setAttribute('rx', String(10 * opening));
        const guardShift = (1 - opening) * 7;
        canvas.querySelector('#transpiration-guard-left')?.setAttribute('cx', String(692 + guardShift));
        canvas.querySelector('#transpiration-guard-right')?.setAttribute('cx', String(738 - guardShift));
        const soilDrops = canvas.querySelector('#transpiration-soil-drops');
        if (soilDrops) soilDrops.style.opacity = String(0.1 + (water / 100) * 0.85);
        canvas.querySelector('#transpiration-vapor').style.opacity = String(rate === 0 ? 0 : 0.25 + rate / 100);
        canvas.style.setProperty('--transpiration-duration', `${rate > 0 ? 120 / rate : 4}s`);
        canvas.classList.toggle('transpiration-flowing', rate > 0);
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

    root.querySelector('#transpiration-motion')?.addEventListener('click', (event) => {
        const paused = canvas.classList.toggle('transpiration-paused');
        event.currentTarget.setAttribute('aria-pressed', String(paused));
        event.currentTarget.textContent = paused ? 'Resume flow animation' : 'Pause flow animation';
    });

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
