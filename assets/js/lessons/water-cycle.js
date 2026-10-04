const SVG_NS = 'http://www.w3.org/2000/svg';

document.addEventListener('DOMContentLoaded', () => {
    const stageController = initStageSelector();
    initCycleHero(stageController);
    initPhaseExplorer();
    initDistributionChart();
    initSimulation(stageController);
    initTranspirationExplorer();
    initUsgsDiagram();
    initQuiz();
    initScavengerHunt();
    initContentsToggle();
    initKeyboardNavigation();
});

function initStageSelector() {
    const buttons = Array.from(document.querySelectorAll('.stage-btn'));
    const explanations = Array.from(document.querySelectorAll('.stage-explanation'));
    const stageData = [
        { name: 'Evaporation', state: 'Liquid to gas', temp: 'Sun-warmed — happens at any temperature', transition: 'Water warms and becomes vapor.' },
        { name: 'Condensation', state: 'Gas to liquid', temp: 'Cooling below the dew point', transition: 'Water vapor cools into droplets.' },
        { name: 'Precipitation', state: 'Liquid or ice falling', temp: 'Droplets merge until too heavy to stay aloft', transition: 'Water falls as rain, snow, sleet, or hail.' },
        { name: 'Collection', state: 'Liquid water stored', temp: 'Stable surface temperatures', transition: 'Water gathers in rivers, lakes, and oceans.' },
        { name: 'Infiltration', state: 'Liquid moving underground', temp: 'Cooling in shaded soil', transition: 'Water sinks into soil and aquifers.' },
        { name: 'Transpiration', state: 'Liquid to gas in plants', temp: 'Leaf warming drives vapor release', transition: 'Plants return water vapor to the air.' }
    ];

    let activeIndex = 0;

    function activate(index, focus = false) {
        activeIndex = (index + stageData.length) % stageData.length;
        buttons.forEach((button, buttonIndex) => {
            const isActive = buttonIndex === activeIndex;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
        explanations.forEach((explanation, expIndex) => {
            explanation.style.display = expIndex === activeIndex ? 'block' : 'none';
        });
        if (focus) {
            document.getElementById('how')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        document.dispatchEvent(new CustomEvent('watercycle:stagechange', {
            detail: { index: activeIndex, ...stageData[activeIndex] }
        }));
    }

    buttons.forEach((button, index) => {
        button.addEventListener('click', () => activate(index));
    });

    document.getElementById('stage-focus-btn')?.addEventListener('click', () => activate(activeIndex, true));
    activate(0);

    return {
        getActiveIndex: () => activeIndex,
        getStageData: (index = activeIndex) => stageData[index],
        activate
    };
}

function initCycleHero(stageController) {
    const canvas = document.getElementById('cycle-hero-canvas');
    const referenceDiagram = document.getElementById('cycle-reference-diagram');
    const playPauseBtn = document.getElementById('cycle-play-pause-btn');
    const prevBtn = document.getElementById('cycle-prev-btn');
    const nextBtn = document.getElementById('cycle-next-btn');
    const stageReadout = document.getElementById('cycle-stage-readout');
    const stateReadout = document.getElementById('cycle-state-readout');
    const tempReadout = document.getElementById('cycle-temp-readout');
    if (!canvas && referenceDiagram) {
        let activeIndex = stageController.getActiveIndex();
        let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function updateReadouts(index) {
            activeIndex = (index + 6) % 6;
            const active = stageController.getStageData(activeIndex);
            stageReadout.textContent = active.name;
            stateReadout.textContent = active.state;
            tempReadout.textContent = active.temp;
            referenceDiagram.dataset.stage = active.name.toLowerCase();
        }

        function setStage(index) {
            stageController.activate((index + 6) % 6);
        }

        playPauseBtn?.addEventListener('click', () => {
            playing = !playing;
            playPauseBtn.textContent = playing ? 'Pause Loop' : 'Resume Loop';
        });
        prevBtn?.addEventListener('click', () => setStage(activeIndex - 1));
        nextBtn?.addEventListener('click', () => setStage(activeIndex + 1));
        document.addEventListener('watercycle:stagechange', (event) => updateReadouts(event.detail.index));

        updateReadouts(activeIndex);
        if (!playing && playPauseBtn) playPauseBtn.textContent = 'Resume Loop';
        window.setInterval(() => {
            if (playing && !document.hidden) setStage(activeIndex + 1);
        }, 3000);
        return;
    }
    if (!canvas) return;

    const stageNodes = [
        { x: 130, y: 300, label: 'Evaporation', color: '#1e90ff' },
        { x: 240, y: 100, label: 'Condensation', color: '#ffffff' },
        { x: 410, y: 120, label: 'Precipitation', color: '#d8f1ff' },
        { x: 555, y: 300, label: 'Collection', color: '#1e90ff' },
        { x: 420, y: 335, label: 'Infiltration', color: '#5aa9e6' },
        { x: 280, y: 260, label: 'Transpiration', color: '#ffffff' }
    ];

    let activeIndex = 0;
    let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let loopId = null;
    let particle = null;

    function render() {
        canvas.innerHTML = '';
        canvas.appendChild(svg('rect', { x: 0, y: 0, width: 760, height: 420, fill: '#dff4ff' }));
        canvas.appendChild(svg('rect', { x: 0, y: 320, width: 760, height: 100, fill: '#c5b28f', opacity: 0.8 }));
        canvas.appendChild(svg('rect', { x: 0, y: 290, width: 215, height: 130, fill: '#1e90ff', opacity: 0.72 }));
        canvas.appendChild(svg('circle', { cx: 650, cy: 75, r: 42, fill: '#ffd54f' }));
        canvas.appendChild(svg('polygon', { points: '500,320 590,145 700,320', fill: '#9d846f' }));
        canvas.appendChild(svg('path', { d: 'M 590 148 Q 515 220 430 310', stroke: '#2f9df4', 'stroke-width': 8, fill: 'none', opacity: 0.75 }));
        canvas.appendChild(svg('ellipse', { cx: 260, cy: 90, rx: 60, ry: 32, fill: '#fff', opacity: 0.95 }));
        canvas.appendChild(svg('ellipse', { cx: 305, cy: 102, rx: 68, ry: 36, fill: '#fff', opacity: 0.9 }));
        canvas.appendChild(svg('ellipse', { cx: 225, cy: 106, rx: 50, ry: 28, fill: '#fff', opacity: 0.92 }));
        canvas.appendChild(svg('ellipse', { cx: 290, cy: 255, rx: 58, ry: 78, fill: '#4caf50', opacity: 0.85 }));
        canvas.appendChild(svg('rect', { x: 283, y: 250, width: 14, height: 90, fill: '#6b4f2b' }));

        stageNodes.forEach((node, index) => {
            const group = svg('g');
            const ring = svg('circle', {
                cx: node.x, cy: node.y, r: index === activeIndex ? 30 : 24,
                fill: node.color, stroke: index === activeIndex ? '#0c5a94' : '#7aa7c7', 'stroke-width': index === activeIndex ? 5 : 2
            });
            const label = svg('text', { x: node.x, y: node.y + 50, 'text-anchor': 'middle', 'font-size': 14, fill: '#184768', 'font-weight': 700 }, node.label);
            group.append(ring, label);
            canvas.appendChild(group);
        });

        for (let i = 0; i < stageNodes.length; i += 1) {
            const current = stageNodes[i];
            const next = stageNodes[(i + 1) % stageNodes.length];
            canvas.appendChild(svg('path', {
                d: `M ${current.x} ${current.y} Q ${(current.x + next.x) / 2} ${(current.y + next.y) / 2 - 55} ${next.x} ${next.y}`,
                stroke: '#7dc9ff', 'stroke-width': 4, fill: 'none', 'stroke-dasharray': '10 8', opacity: 0.9
            }));
        }

        const active = stageController.getStageData(activeIndex);
        stageReadout.textContent = active.name;
        stateReadout.textContent = active.state;
        tempReadout.textContent = active.temp;
        particle = svg('circle', { cx: stageNodes[activeIndex].x, cy: stageNodes[activeIndex].y, r: 10, fill: activeIndex === 2 ? '#bfe6ff' : activeIndex === 1 || activeIndex === 5 ? '#ffffff' : '#1e90ff', stroke: '#0a4a79', 'stroke-width': 2 });
        canvas.appendChild(particle);
    }

    function animateBetweenStages(fromIndex, toIndex) {
        render();
        const start = stageNodes[fromIndex];
        const end = stageNodes[toIndex];
        if (!particle) return;
        particle.animate([
            { transform: `translate(${start.x - start.x}px, ${start.y - start.y}px)` },
            { transform: `translate(${end.x - start.x}px, ${end.y - start.y}px)` }
        ], { duration: 900, easing: 'ease-in-out' });
    }

    function setStage(index, animate = false) {
        const previous = activeIndex;
        activeIndex = (index + stageNodes.length) % stageNodes.length;
        stageController.activate(activeIndex);
        if (animate) animateBetweenStages(previous, activeIndex);
    }

    function startLoop() {
        clearInterval(loopId);
        loopId = setInterval(() => {
            if (!playing) return;
            setStage(activeIndex + 1, true);
        }, 2600);
    }

    playPauseBtn?.addEventListener('click', () => {
        playing = !playing;
        playPauseBtn.textContent = playing ? 'Pause Loop' : 'Resume Loop';
    });
    prevBtn?.addEventListener('click', () => setStage(activeIndex - 1, true));
    nextBtn?.addEventListener('click', () => setStage(activeIndex + 1, true));

    document.addEventListener('watercycle:stagechange', (event) => {
        activeIndex = event.detail.index;
        render();
    });

    render();
    if (!playing && playPauseBtn) playPauseBtn.textContent = 'Resume Loop';
    startLoop();
}

function initPhaseExplorer() {
    drawPhaseChangeDiagram();
    animateMolecules();
}

function drawPhaseChangeDiagram() {
    const canvas = document.getElementById('phase-change-canvas');
    if (!canvas) return;
    canvas.innerHTML = '';
    canvas.appendChild(svg('rect', { x: 0, y: 0, width: 640, height: 280, fill: '#f7fcff' }));
    const states = [
        { x: 100, label: 'Solid', color: '#bfe6ff', sub: 'Below 0°C' },
        { x: 320, label: 'Liquid', color: '#1e90ff', sub: '0°C to 100°C' },
        { x: 540, label: 'Gas', color: '#ffffff', sub: 'Above 100°C' }
    ];
    states.forEach((state) => {
        canvas.appendChild(svg('circle', { cx: state.x, cy: 95, r: 46, fill: state.color, stroke: '#0f6bb4', 'stroke-width': 3 }));
        canvas.appendChild(svg('text', { x: state.x, y: 101, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: '#12456f' }, state.label));
        canvas.appendChild(svg('text', { x: state.x, y: 155, 'text-anchor': 'middle', 'font-size': 13, fill: '#4d6a82' }, state.sub));
    });
    const arrows = [
        [145, 95, 275, 95, 'Melting'],
        [365, 95, 495, 95, 'Evaporation'],
        [495, 128, 365, 128, 'Condensation'],
        [275, 128, 145, 128, 'Freezing']
    ];
    arrows.forEach(([x1, y1, x2, y2, label]) => {
        canvas.appendChild(svg('line', { x1, y1, x2, y2, stroke: '#63b3ed', 'stroke-width': 6, 'marker-end': 'url(#phaseArrow)' }));
        canvas.appendChild(svg('text', { x: (x1 + x2) / 2, y: y1 - 12, 'text-anchor': 'middle', 'font-size': 12, fill: '#0f6bb4', 'font-weight': 700 }, label));
    });
    const defs = svg('defs');
    const marker = svg('marker', { id: 'phaseArrow', markerWidth: 10, markerHeight: 10, refX: 9, refY: 3, orient: 'auto' });
    marker.appendChild(svg('polygon', { points: '0 0, 10 3, 0 6', fill: '#63b3ed' }));
    defs.appendChild(marker);
    canvas.appendChild(defs);

    canvas.appendChild(svg('rect', { x: 575, y: 20, width: 22, height: 220, rx: 10, fill: '#e8f4fb', stroke: '#89b7d6' }));
    canvas.appendChild(svg('rect', { x: 578, y: 75, width: 16, height: 140, rx: 8, fill: '#ff7b54', opacity: 0.85 }));
    canvas.appendChild(svg('text', { x: 605, y: 35, 'font-size': 12, fill: '#1c496d' }, 'Thermometer'));
    ['-10°C', '0°C', '50°C', '100°C'].forEach((label, index) => {
        canvas.appendChild(svg('text', { x: 605, y: 225 - index * 48, 'font-size': 11, fill: '#577089' }, label));
    });
}

function animateMolecules() {
    const canvas = document.getElementById('molecule-canvas');
    if (!canvas) return;
    canvas.innerHTML = '';
    canvas.appendChild(svg('rect', { x: 0, y: 0, width: 360, height: 180, fill: '#ffffff' }));
    ['Solid', 'Liquid', 'Gas'].forEach((label, column) => {
        canvas.appendChild(svg('text', { x: 60 + column * 120, y: 20, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#1d4f77' }, label));
    });

    const particles = [];
    const zones = [
        { x: 20, y: 30, w: 80, h: 120, jitter: 2 },
        { x: 140, y: 30, w: 80, h: 120, jitter: 8 },
        { x: 260, y: 30, w: 80, h: 120, jitter: 18 }
    ];
    zones.forEach((zone, zoneIndex) => {
        for (let i = 0; i < 7; i += 1) {
            const circle = svg('circle', {
                cx: zone.x + 18 + (i % 3) * 20,
                cy: zone.y + 18 + Math.floor(i / 3) * 24,
                r: 7,
                fill: zoneIndex === 0 ? '#bfe6ff' : zoneIndex === 1 ? '#1e90ff' : '#ffffff',
                stroke: '#0f6bb4',
                'stroke-width': 2
            });
            canvas.appendChild(circle);
            particles.push({ node: circle, baseX: Number(circle.getAttribute('cx')), baseY: Number(circle.getAttribute('cy')), zone });
        }
    });

    function tick() {
        particles.forEach((particle) => {
            const offsetX = (Math.random() - 0.5) * particle.zone.jitter;
            const offsetY = (Math.random() - 0.5) * particle.zone.jitter;
            particle.node.setAttribute('cx', `${particle.baseX + offsetX}`);
            particle.node.setAttribute('cy', `${particle.baseY + offsetY}`);
        });
        requestAnimationFrame(tick);
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) tick();
}

function initDistributionChart() {
    const canvas = document.getElementById('distribution-chart');
    const tooltip = document.getElementById('distribution-tooltip');
    if (!canvas) return;
    let zoomFreshwater = false;
    // Figures per NOAA Education, "The water cycle": saltwater 97.5%, freshwater 2.5%;
    // within freshwater, glaciers/ice/snow ~68%, groundwater ~30%, surface water well under 1%.
    const earthWater = [
        { label: 'Saltwater', value: 97.5, color: '#1e90ff', target: '#simulation' },
        { label: 'Freshwater', value: 2.5, color: '#74c0fc', target: '#states' }
    ];
    const freshwater = [
        { label: 'Glaciers & Ice', value: 68, color: '#cdefff', target: '#states' },
        { label: 'Groundwater', value: 30, color: '#3d8bd9', target: '#scavenger' },
        { label: 'Lakes, Rivers & Other', value: 2, color: '#8dd3ff', target: '#where' }
    ];
    const SMALL_SLICE_THRESHOLD = 8;

    function render() {
        const data = zoomFreshwater ? freshwater : earthWater;
        canvas.innerHTML = '';
        const cx = 190;
        const cy = 160;
        const radius = 110;
        let startAngle = -Math.PI / 2;
        data.forEach((slice) => {
            const sweep = (slice.value / 100) * Math.PI * 2;
            const endAngle = startAngle + sweep;
            const path = describeArcSlice(cx, cy, radius, startAngle, endAngle);
            const node = svg('path', {
                d: path,
                fill: slice.color,
                class: 'distribution-chart-slice',
                tabindex: 0,
                role: 'button',
                'aria-label': `${slice.label}: ${slice.value}${zoomFreshwater ? '% of freshwater' : "% of Earth's water"}`
            });
            const showSliceDetails = () => {
                tooltip.textContent = `${slice.label}: ${slice.value}${zoomFreshwater ? '% of freshwater' : "% of Earth's water"}`;
            };
            const openSliceSection = () => {
                document.querySelector(slice.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            node.addEventListener('mouseenter', showSliceDetails);
            node.addEventListener('focus', showSliceDetails);
            node.addEventListener('click', openSliceSection);
            node.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openSliceSection();
                }
            });
            canvas.appendChild(node);

            // Small slices get their label pushed outside the pie with a leader line so
            // adjacent thin wedges (e.g. a 2% sliver) don't collide or become illegible.
            const labelAngle = startAngle + sweep / 2;
            const isSmall = slice.value < SMALL_SLICE_THRESHOLD;
            const labelRadius = isSmall ? radius + 34 : radius - 2;
            const labelX = cx + Math.cos(labelAngle) * labelRadius;
            const labelY = cy + Math.sin(labelAngle) * labelRadius;
            const anchor = !isSmall ? 'middle' : Math.cos(labelAngle) < -0.15 ? 'end' : Math.cos(labelAngle) > 0.15 ? 'start' : 'middle';

            if (isSmall) {
                canvas.appendChild(svg('line', {
                    x1: cx + Math.cos(labelAngle) * radius,
                    y1: cy + Math.sin(labelAngle) * radius,
                    x2: labelX,
                    y2: labelY,
                    stroke: '#7a93a8',
                    'stroke-width': 1
                }));
            }

            canvas.appendChild(svg('text', { x: labelX, y: labelY, 'text-anchor': anchor, 'font-size': 12, fill: '#12456f', 'font-weight': 700 }, slice.label));
            canvas.appendChild(svg('text', { x: labelX, y: labelY + 14, 'text-anchor': anchor, 'font-size': 11, fill: '#517089' }, `${slice.value}%`));

            startAngle = endAngle;
        });
        canvas.appendChild(svg('circle', { cx, cy, r: 52, fill: '#ffffff' }));
        canvas.appendChild(svg('text', { x: cx, y: cy - 6, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: '#144f7d' }, zoomFreshwater ? 'Freshwater' : 'Earth Water'));
        canvas.appendChild(svg('text', { x: cx, y: cy + 18, 'text-anchor': 'middle', 'font-size': 12, fill: '#517089' }, zoomFreshwater ? 'Zoomed View' : 'Global View'));
    }

    document.getElementById('freshwater-zoom-btn')?.addEventListener('click', () => {
        zoomFreshwater = true;
        render();
    });
    document.getElementById('distribution-reset-btn')?.addEventListener('click', () => {
        zoomFreshwater = false;
        render();
    });
    document.querySelectorAll('.distribution-jump').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelector(button.dataset.jumpTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
    render();
}

function initSimulation(stageController) {
    const canvas = document.getElementById('simulation-canvas');
    if (!canvas) return;
    const state = {
        sun: 65,
        temperature: 24,
        humidity: 55,
        season: 'Summer',
        playing: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
        reset: document.getElementById('reset-btn'),
        atmosphere: document.getElementById('metric-atmosphere'),
        oceans: document.getElementById('metric-oceans'),
        underground: document.getElementById('metric-underground')
    };

    const particles = Array.from({ length: 18 }, (_, index) => ({ offset: index / 18, stage: index % 6 }));
    let frame = 0;

    let saved = null;
    function tendency() {
        return Math.round((0.25 + state.sun / 133) * (state.temperature + 15) / 55 * (1 - state.humidity / 100) * 100);
    }
    function updateReadouts() {
        el.sunValue.textContent = state.sun;
        el.tempValue.textContent = state.temperature;
        el.humidityValue.textContent = state.humidity;
        const index = tendency();
        el.atmosphere.textContent = `${index < 20 ? 'Low' : index < 50 ? 'Moderate' : 'High'} · ${index}/100`;
        el.oceans.textContent = state.humidity >= 90 ? 'Nearly saturated' : state.humidity >= 60 ? 'Humid air' : 'Drier air';
        el.underground.textContent = state.humidity >= 90 ? 'Near saturation' : 'Cooling still needed';
        document.getElementById('weather-explanation').textContent = 'Drier air allows more net evaporation under otherwise equal conditions. Clouds form when air reaches saturation, often by cooling. Humidity alone does not determine rainfall.';
        if (saved) {
            const change = index - saved.index;
            document.getElementById('weather-comparison').textContent = `Saved: ${saved.sun}% sun, ${saved.temperature}°C, ${saved.humidity}% humidity → ${saved.index}/100. Current tendency is ${change === 0 ? 'unchanged' : `${Math.abs(change)} points ${change > 0 ? 'higher' : 'lower'}`}.`;
        }
    }
    document.getElementById('weather-save').addEventListener('click', () => { saved = { ...state, index: tendency() }; updateReadouts(); });
    document.querySelectorAll('[data-weather]').forEach(button => button.addEventListener('click', () => {
        const presets = { dry: [80, 30, 25, 'Summer'], humid: [80, 30, 90, 'Summer'], cold: [25, -5, 70, 'Winter'] };
        [state.sun, state.temperature, state.humidity, state.season] = presets[button.dataset.weather];
        el.sun.value = state.sun; el.temp.value = state.temperature; el.humidity.value = state.humidity; el.season.value = state.season;
        render();
    }));

    function render() {
        canvas.innerHTML = '';
        const defs = svg('defs');
        defs.innerHTML = '<linearGradient id="wc-lake" x2="0" y2="1"><stop stop-color="#58c7da"/><stop offset="1" stop-color="#165674"/></linearGradient><pattern id="wc-soil" width="38" height="24" patternUnits="userSpaceOnUse"><rect width="38" height="24" fill="#c4b08b"/><path d="M0 8Q10 5 20 8T38 8M7 18h5M29 20h3" fill="none" stroke="#967d57" stroke-width="1" opacity=".5"/></pattern>';
        canvas.appendChild(defs);
        canvas.appendChild(svg('rect', { x: 0, y: 0, width: 720, height: 420, fill: state.temperature > 28 ? '#ffe8c2' : '#dff4ff' }));
        canvas.appendChild(svg('rect', { x: 0, y: 305, width: 720, height: 115, fill: 'url(#wc-soil)' }));
        canvas.appendChild(svg('rect', { x: 0, y: 278, width: 220, height: 142, fill: 'url(#wc-lake)', opacity: 0.78 }));
        canvas.appendChild(svg('circle', { cx: 610, cy: 70, r: 40, fill: seasonSunColor(state.season) }));
        canvas.appendChild(svg('ellipse', { cx: 255, cy: 95, rx: 68 + state.humidity / 5, ry: 34, fill: '#ffffff', opacity: 0.86 }));
        canvas.appendChild(svg('ellipse', { cx: 330, cy: 108, rx: 70, ry: 38, fill: '#ffffff', opacity: 0.9 }));
        canvas.appendChild(svg('polygon', { points: '460,305 540,135 665,305', fill: '#9d846f' }));
        canvas.appendChild(svg('path', { d: 'M 540 142 Q 455 220 355 292', stroke: '#2f9df4', 'stroke-width': 8, fill: 'none' }));
        canvas.appendChild(svg('ellipse', { cx: 280, cy: 240, rx: 60, ry: 80, fill: '#4caf50', opacity: 0.85 }));
        canvas.appendChild(svg('rect', { x: 273, y: 238, width: 14, height: 82, fill: '#6b4f2b' }));
        canvas.appendChild(svg('rect', { x: 380, y: 336, width: 200, height: 32, fill: '#6aaee6', opacity: 0.65 }));

        const stageIndex = stageController.getActiveIndex();
        canvas.appendChild(svg('path', { d: 'M512 195L540 135L584 196L555 183L540 164L526 187Z', fill: '#f3f8f8' }));
        for (let y = 290; y < 410; y += 25) canvas.appendChild(svg('path', { d: `M12 ${y}q22 -5 44 0t44 0t44 0t44 0`, fill: 'none', stroke: '#b8e7ec', opacity: .4 }));
        [['Ocean / lake', 25, 395], ['Groundwater storage', 388, 390], ['Runoff ↓', 440, 260], ['Atmosphere', 215, 45]].forEach(([text, x, y]) => canvas.appendChild(svg('text', { x, y, fill: '#173d50', 'font-size': 15, 'font-weight': 600, 'paint-order': 'stroke', stroke: '#f5faf8', 'stroke-width': 3 }, text)));

        particles.forEach((particle, index) => {
            const position = cycleSimulationPoint((frame / 180 + particle.offset) % 1);
            canvas.appendChild(svg('circle', {
                cx: position.x,
                cy: position.y,
                r: 5,
                fill: position.state === 'gas' ? '#ffffff' : position.state === 'ice' ? '#bfe6ff' : '#1e90ff',
                stroke: '#0a4a79',
                'stroke-width': 1.5
            }));
            if (index === 0 && stageIndex !== undefined) {
                canvas.appendChild(svg('text', { x: position.x + 10, y: position.y - 8, 'font-size': 12, fill: '#12456f', 'font-weight': 700 }, 'Example water route'));
            }
        });

        updateReadouts();
    }

    SimKit.loop((dt) => {
        if (!state.playing) return;
        frame += Math.min(dt * 60, 3) * (0.5 + tendency() / 65);
        render();
    });

    [['input', el.sun, 'sun'], ['input', el.temp, 'temperature'], ['input', el.humidity, 'humidity'], ['change', el.season, 'season']].forEach(([type, node, key]) => {
        node?.addEventListener(type, (event) => {
            state[key] = type === 'change' ? event.target.value : Number(event.target.value);
            render();
        });
    });
    el.toggle?.addEventListener('click', () => {
        state.playing = !state.playing;
        el.toggle.textContent = state.playing ? 'Pause Cycle' : 'Resume Cycle';
        el.toggle.setAttribute('aria-pressed', String(state.playing));
    });
    el.reset?.addEventListener('click', () => {
        saved = null; frame = 0;
        document.getElementById('weather-comparison').textContent = 'Save a result, change one variable, and compare.';
        state.sun = 65;
        state.temperature = 24;
        state.humidity = 55;
        state.season = 'Summer';
        state.playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.sun.value = '65';
        el.temp.value = '24';
        el.humidity.value = '55';
        el.season.value = 'Summer';
        el.toggle.textContent = state.playing ? 'Pause Cycle' : 'Resume Cycle';
        el.toggle.setAttribute('aria-pressed', String(state.playing));
        render();
    });

    if (!state.playing && el.toggle) el.toggle.textContent = 'Resume Cycle';
    el.toggle.setAttribute('aria-pressed', String(state.playing));
    render();
}

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
        <g data-tp-region="0">
          <path d="M0 347Q135 334 292 347V520H0Z" fill="url(#tp-soil)"/>
          <path d="M155 348V139" stroke="#8d6945" stroke-width="22" stroke-linecap="round"/>
          <g fill="url(#tp-leaf)" stroke="#276447" stroke-width="2">
            <path d="M153 266Q53 249 47 160Q140 158 153 266Z"/><path d="M158 220Q174 111 267 119Q268 199 158 220Z"/><path d="M155 168Q98 113 135 57Q194 101 155 168Z"/>
          </g>
          <g stroke="#add1a0" fill="none" stroke-width="2"><path d="M151 258L66 179m32 25l-5 -27m29 48l-2 -28M162 215L249 135m-48 44l29 -3m-51 23l5 -32M155 156L138 78"/></g>
          <path d="M155 346Q105 398 48 460M155 346Q192 401 267 469M155 354V492M106 400L83 484M201 417L219 491" stroke="#8d6945" stroke-width="7" fill="none" stroke-linecap="round"/>
          <g stroke="#8d6945" stroke-width="1.5"><path d="M67 441l-19 -2m26 -8l-5 -14m41 41l15 11m117 -21l17 -3m-65 -31l-3 16m-30 36l-12 9m9 -29l12 6"/></g>
          <g fill="#329dc5" opacity=".6"><circle cx="39" cy="421" r="4"/><circle cx="95" cy="480" r="4"/><circle cx="244" cy="439" r="4"/><circle cx="180" cy="475" r="4"/></g>
          <text x="24" y="32" class="tp-title">01 · Roots absorb</text><text x="24" y="320" class="tp-small">Root hairs contact soil water</text>
        </g>
        <path d="M168 260L315 225M257 145L561 121" stroke="#81978d" stroke-dasharray="4 5" fill="none"/>
        <g data-tp-region="1">
          <rect x="311" y="51" width="206" height="437" rx="14" fill="#fff" stroke="#b4cdc4"/>
          <text x="330" y="83" class="tp-title">02 · Xylem pulls</text>
          <path d="M373 139V400M452 139V400" stroke="#b2956c" stroke-width="13"/>
          <path d="M389 139V400H437V139Z" fill="#d9f1fa"/>
          <g fill="#59b4d8" stroke="#16749b" stroke-width="1.5"><circle cx="413" cy="179" r="11"/><circle cx="413" cy="220" r="11"/><circle cx="413" cy="261" r="11"/><circle cx="413" cy="302" r="11"/><circle cx="413" cy="343" r="11"/></g>
          <path id="transpiration-xylem" stroke-dasharray="8 10" d="M413 344V152" stroke="#136e9b" stroke-width="3" fill="none" marker-end="url(#tp-arrow)"/>
          <text x="329" y="435" class="tp-small">Cohesion holds water</text><text x="329" y="457" class="tp-small">together under tension</text>
        </g>
        <g data-tp-region="2">
          <rect x="546" y="51" width="336" height="437" rx="14" fill="#fff" stroke="#b4cdc4"/>
          <text x="565" y="83" class="tp-title">03 · Leaf releases</text>
          <text x="565" y="115" class="tp-small">Leaf cross-section · magnified</text>
          <path d="M563 143H865V170H563ZM563 301H681V323H563ZM749 301H865V323H749Z" fill="#78ad70" stroke="#3c7950"/>
          <g fill="#a6c78b" stroke="#5e965f" stroke-width="2"><ellipse cx="593" cy="204" rx="23" ry="25"/><ellipse cx="649" cy="205" rx="23" ry="25"/><ellipse cx="711" cy="204" rx="23" ry="25"/><ellipse cx="775" cy="206" rx="23" ry="25"/><ellipse cx="840" cy="203" rx="20" ry="25"/><ellipse cx="605" cy="260" rx="29" ry="20"/><ellipse cx="668" cy="258" rx="22" ry="21"/><ellipse cx="789" cy="258" rx="29" ry="20"/><ellipse cx="849" cy="260" rx="18" ry="20"/></g>
          <path d="M675 230Q714 253 739 279" fill="none" stroke="#329dc5" stroke-width="4"/>
          <text x="572" y="354" class="tp-small">Guard cells</text><path d="M650 348L690 315" stroke="#58766a" fill="none"/>
          <ellipse cx="692" cy="309" rx="19" ry="13" fill="#3e8d59"/><ellipse cx="738" cy="309" rx="19" ry="13" fill="#3e8d59"/>
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
    root.querySelectorAll('[data-transpiration-step]').forEach(button => {
        button.addEventListener('click', () => selectStep(Number(button.dataset.transpirationStep)));
    });
    function selectStep(index) {
        root.querySelectorAll('[data-transpiration-step]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.transpirationStep) === index)));
        canvas.querySelectorAll('[data-tp-region]').forEach(region => region.classList.toggle('tp-selected', Number(region.dataset.tpRegion) === index));
        const panel = root.querySelector('#transpiration-explanation');
        panel.replaceChildren();
        const title = document.createElement('strong');
        title.textContent = explanations[index][0];
        const description = document.createElement('span');
        description.textContent = explanations[index][1];
        panel.append(title, description);
    }
    let savedFlow = null;
    function render() {
        const h = Number(humidity.value), water = Number(soil.value), opening = Number(stomata.value);
        const rate = Math.round((1 - h / 100) * water * opening);
        root.querySelector('#transpiration-humidity-value').textContent = `${h}%`;
        root.querySelector('#transpiration-soil-value').textContent = `${water}%`;
        root.querySelector('#transpiration-rate').textContent = `Relative flow: ${rate} / 100`;
        root.querySelector('#transpiration-meter').value = rate;
        if (savedFlow) root.querySelector('#transpiration-comparison').textContent = `Saved: ${savedFlow.h}% humidity, ${savedFlow.water}% soil water, ${savedFlow.label} pores → ${savedFlow.rate}/100. Now: ${rate}/100 (${rate - savedFlow.rate > 0 ? '+' : ''}${rate - savedFlow.rate} points).`;
        root.querySelector('#transpiration-feedback').textContent = opening === 0 ? 'Stomatal flow stops in this model. The pore is closed.' : water === 0 ? 'No soil water is available to sustain the modeled flow.' : water <= 20 ? 'Water supply limits flow. Real plants often close stomata during drought.' : h >= 70 ? 'Humid air reduces the difference in water vapor concentration between leaf and air.' : 'Drier air favors vapor loss when soil water and open stomata support the flow.';
        canvas.querySelector('#transpiration-pore').setAttribute('rx', String(10 * opening));
        canvas.querySelector('#transpiration-vapor').style.opacity = String(rate === 0 ? 0 : 0.25 + rate / 100);
        canvas.style.setProperty('--transpiration-duration', `${rate > 0 ? 120 / rate : 4}s`);
        canvas.classList.toggle('transpiration-flowing', rate > 0);
    }
    root.querySelector('#transpiration-save').addEventListener('click', () => { savedFlow = { h: Number(humidity.value), water: Number(soil.value), label: stomata.selectedOptions[0].textContent.toLowerCase(), rate: Number(root.querySelector('#transpiration-meter').value) }; render(); });
    [humidity, soil, stomata].forEach(control => control.addEventListener('input', render));
    root.querySelectorAll('[data-transpiration-preset]').forEach(button => button.addEventListener('click', () => {
        if (button.dataset.transpirationPreset === 'reset') { savedFlow = null; root.querySelector('#transpiration-comparison').textContent = 'Save a baseline, change one condition, then explain the difference.'; selectStep(0); }
        humidity.value = button.dataset.transpirationPreset === 'humid' ? '90' : '40';
        soil.value = button.dataset.transpirationPreset === 'drought' ? '10' : '80';
        stomata.value = button.dataset.transpirationPreset === 'drought' ? '0.35' : '1';
        render();
    }));
    root.querySelector('#transpiration-motion').addEventListener('click', event => {
        const paused = canvas.classList.toggle('transpiration-paused');
        event.currentTarget.setAttribute('aria-pressed', String(paused));
        event.currentTarget.textContent = paused ? 'Resume flow animation' : 'Pause flow animation';
    });
    selectStep(0);
    render();
}

function initUsgsDiagram() {
    const viewport = document.getElementById('usgs-diagram-viewport');
    const wrapper = document.getElementById('usgs-diagram-wrapper');
    const img = document.getElementById('usgs-diagram-img');
    const loading = document.getElementById('usgs-diagram-loading');
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

    function applyTransform() {
        wrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
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
            if (fullResolutionBtn) fullResolutionBtn.textContent = 'Full Resolution Loaded';
        };
        probe.onerror = () => {
            loading.textContent = 'Could not load the high-resolution diagram. Check your connection and try again.';
            if (fullResolutionBtn) {
                fullResolutionBtn.disabled = false;
                fullResolutionBtn.textContent = 'Try Full Resolution Again';
            }
        };
        probe.src = target.src;
    }

    document.getElementById('usgs-zoom-in-btn')?.addEventListener('click', () => setZoom(state.zoom + ZOOM_STEP));
    document.getElementById('usgs-zoom-out-btn')?.addEventListener('click', () => setZoom(state.zoom - ZOOM_STEP));
    document.getElementById('usgs-zoom-reset-btn')?.addEventListener('click', resetView);

    fullResolutionBtn?.addEventListener('click', () => {
        loadFullResolution(state.lang);
    });

    document.getElementById('usgs-lang-toggle-btn')?.addEventListener('click', (event) => {
        state.lang = state.lang === 'en' ? 'es' : 'en';
        event.target.textContent = state.lang === 'en' ? 'Español' : 'English';
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
        wrapper.classList.add('is-dragging');
        dragStartX = event.clientX - state.panX;
        dragStartY = event.clientY - state.panY;
        wrapper.setPointerCapture(event.pointerId);
    });

    wrapper.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        state.panX = event.clientX - dragStartX;
        state.panY = event.clientY - dragStartY;
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

    applyTransform();
}

function initQuiz() {
    const questions = [
        ['Which process turns liquid water into vapor?', ['Condensation', 'Evaporation', 'Collection', 'Infiltration'], 1, 'Evaporation happens when liquid water gains enough energy to become vapor.'],
        ['What powers the water cycle?', ['The Moon', 'Earth’s core', 'The Sun', 'Wind alone'], 2, 'Solar energy heats water and drives evaporation and weather patterns.'],
        ['How much of Earth’s water is in the oceans?', ['50%', '75%', '97%', '99.9%'], 2, 'About 97% of Earth’s water is saltwater in the oceans.'],
        ['Which stage describes water soaking into soil?', ['Collection', 'Infiltration', 'Precipitation', 'Transpiration'], 1, 'Infiltration is the movement of water into soil and underground layers.'],
        ['What do plants release during transpiration?', ['Liquid water', 'Ice crystals', 'Water vapor', 'Salt'], 2, 'Plants release water vapor from tiny openings in their leaves.'],
        ['At what temperature does water freeze?', ['0°C', '32°C', '50°C', '100°C'], 0, 'Water freezes at 0°C under standard conditions.'],
        ['Where is most freshwater stored?', ['Oceans', 'Glaciers and ice', 'Atmosphere', 'Rivers'], 1, 'Most freshwater is locked up in glaciers and ice.'],
        ['What is water beneath Earth’s surface called?', ['Runoff', 'Precipitation', 'Groundwater', 'Vapor'], 2, 'Groundwater is stored beneath the surface in soil and rock.']
    ];
    const container = document.getElementById('quiz-questions');
    const results = document.getElementById('quiz-results');
    const scoreCounter = document.getElementById('quiz-score-counter');
    const progressLabel = document.getElementById('quiz-progress-label');
    const progressBar = document.getElementById('quiz-progress-bar');
    const scoreMessage = document.getElementById('score-message');
    const retake = document.getElementById('retake-quiz-btn');
    let current = 0;
    let score = 0;
    let locked = false;

    function updateMeta() {
        scoreCounter.textContent = `${score}/${questions.length} correct`;
        progressLabel.textContent = current < questions.length ? `Question ${current + 1} of ${questions.length}` : 'Quiz complete';
        progressBar.style.width = `${(current / questions.length) * 100}%`;
    }

    function renderQuestion() {
        const [question, answers, correctIndex, explanation] = questions[current];
        container.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'quiz-question';
        card.innerHTML = `<h4>Question ${current + 1}</h4><p>${question}</p>`;
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
                if (correct) score += 1;
                [...options.children].forEach((child, childIndex) => {
                    child.disabled = true;
                    if (childIndex === correctIndex) child.classList.add('correct');
                    if (childIndex === index && !correct) child.classList.add('incorrect');
                });
                feedback.hidden = false;
                feedback.textContent = `${correct ? 'Correct.' : 'Not quite.'} ${explanation}`;
                updateMeta();
                setTimeout(() => {
                    current += 1;
                    locked = false;
                    if (current < questions.length) {
                        renderQuestion();
                        updateMeta();
                    } else {
                        container.style.display = 'none';
                        results.style.display = 'block';
                        progressBar.style.width = '100%';
                        scoreMessage.textContent = score >= 7 ? `Excellent: ${score}/${questions.length}.` : `You scored ${score}/${questions.length}. Review the animation and try again.`;
                    }
                }, 1600);
            });
            options.appendChild(button);
        });
        card.append(options, feedback);
        container.appendChild(card);
    }

    retake?.addEventListener('click', () => {
        current = 0;
        score = 0;
        results.style.display = 'none';
        container.style.display = 'block';
        renderQuestion();
        updateMeta();
    });

    renderQuestion();
    updateMeta();
}

function initScavengerHunt() {
    const validators = [
        { test: (v) => includesAll(v, ['evaporation', 'condensation', 'precipitation', 'collection', 'infiltration', 'transpiration']), text: 'The six stages are evaporation, condensation, precipitation, collection, infiltration, and transpiration.' },
        { test: (v) => v.includes('heat') || v.includes('energy') || v.includes('evaporation'), text: 'The Sun provides energy that heats water and drives the cycle.' },
        { test: (v) => v.includes('97') && (v.includes('1') || v.includes('fresh')), text: 'About 97% is in oceans and about 1% is accessible freshwater.' },
        { test: (v) => v.includes('plants') && (v.includes('water bodies') || v.includes('ocean') || v.includes('lake')), text: 'Evaporation comes from water surfaces; transpiration comes from plants.' },
        { test: (v) => v.includes('cool') && (v.includes('droplet') || v.includes('liquid')), text: 'Condensation happens when vapor cools and forms liquid droplets.' },
        { test: (v) => v.includes('underground') && (v.includes('fresh') || v.includes('important') || v.includes('drinking')), text: 'Groundwater is underground stored water and an important freshwater supply.' }
    ];
    const scoreCounter = document.getElementById('hunt-score-counter');
    const progressLabel = document.getElementById('hunt-progress-label');
    const progressBar = document.getElementById('hunt-progress-bar');
    const correct = new Set();

    document.querySelectorAll('[data-hunt-check]').forEach((button) => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.huntCheck);
            const input = document.querySelector(`.hunt-input[data-hunt="${index}"]`);
            const feedback = document.getElementById(`hunt-feedback-${index}`);
            const value = (input?.value || '').toLowerCase();
            const ok = validators[index].test(value);
            if (ok) correct.add(index);
            feedback.className = `hunt-feedback ${ok ? 'correct' : 'incorrect'}`;
            feedback.textContent = `${ok ? 'Correct.' : 'Try again.'} ${validators[index].text}`;
            scoreCounter.textContent = `${correct.size}/6 correct`;
            progressLabel.textContent = correct.size === 6 ? 'All scavenger clues solved' : `Solved ${correct.size} of 6`;
            progressBar.style.width = `${(correct.size / 6) * 100}%`;
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

function cycleSimulationPoint(t) {
    const points = [
        { x: 110, y: 300, state: 'liquid' },
        { x: 260, y: 110, state: 'gas' },
        { x: 340, y: 110, state: 'gas' },
        { x: 430, y: 200, state: 'liquid' },
        { x: 465, y: 340, state: 'liquid' },
        { x: 280, y: 235, state: 'gas' },
        { x: 110, y: 300, state: 'liquid' }
    ];
    const scaled = t * (points.length - 1);
    const index = Math.floor(scaled);
    const local = scaled - index;
    const a = points[index];
    const b = points[index + 1];
    return {
        x: a.x + (b.x - a.x) * local,
        y: a.y + (b.y - a.y) * local,
        state: b.state
    };
}

function seasonSunColor(season) {
    return season === 'Winter' ? '#ffe08a' : season === 'Fall' ? '#ffb35c' : season === 'Spring' ? '#ffd86a' : '#ffd54f';
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
