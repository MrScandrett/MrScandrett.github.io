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
        buttons.forEach((button, buttonIndex) => button.classList.toggle('active', buttonIndex === activeIndex));
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
    const playPauseBtn = document.getElementById('cycle-play-pause-btn');
    const prevBtn = document.getElementById('cycle-prev-btn');
    const nextBtn = document.getElementById('cycle-next-btn');
    const stageReadout = document.getElementById('cycle-stage-readout');
    const stateReadout = document.getElementById('cycle-state-readout');
    const tempReadout = document.getElementById('cycle-temp-readout');
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
    let playing = true;
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
        render();
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
    tick();
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
            const node = svg('path', { d: path, fill: slice.color, class: 'distribution-chart-slice' });
            node.addEventListener('mouseenter', () => {
                tooltip.textContent = `${slice.label}: ${slice.value}${zoomFreshwater ? '% of freshwater' : "% of Earth's water"}`;
            });
            node.addEventListener('click', () => {
                document.querySelector(slice.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        playing: true
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

    function updateReadouts() {
        el.sunValue.textContent = `${state.sun}`;
        el.tempValue.textContent = `${state.temperature}`;
        el.humidityValue.textContent = `${state.humidity}`;
        const atmosphere = Math.max(4, Math.min(20, Math.round(state.humidity / 6 + state.temperature / 12)));
        const underground = Math.max(12, Math.min(30, Math.round(24 - state.sun / 10 + (state.season === 'Spring' ? 4 : state.season === 'Winter' ? 6 : 0))));
        const oceans = 100 - atmosphere - underground;
        el.atmosphere.textContent = `${atmosphere}%`;
        el.oceans.textContent = `${oceans}%`;
        el.underground.textContent = `${underground}%`;
    }

    function render() {
        canvas.innerHTML = '';
        canvas.appendChild(svg('rect', { x: 0, y: 0, width: 720, height: 420, fill: state.temperature > 28 ? '#ffe8c2' : '#dff4ff' }));
        canvas.appendChild(svg('rect', { x: 0, y: 305, width: 720, height: 115, fill: '#c4b08b' }));
        canvas.appendChild(svg('rect', { x: 0, y: 278, width: 220, height: 142, fill: '#1e90ff', opacity: 0.78 }));
        canvas.appendChild(svg('circle', { cx: 610, cy: 70, r: 40, fill: seasonSunColor(state.season) }));
        canvas.appendChild(svg('ellipse', { cx: 255, cy: 95, rx: 68 + state.humidity / 5, ry: 34, fill: '#ffffff', opacity: 0.86 }));
        canvas.appendChild(svg('ellipse', { cx: 330, cy: 108, rx: 70, ry: 38, fill: '#ffffff', opacity: 0.9 }));
        canvas.appendChild(svg('polygon', { points: '460,305 540,135 665,305', fill: '#9d846f' }));
        canvas.appendChild(svg('path', { d: 'M 540 142 Q 455 220 355 292', stroke: '#2f9df4', 'stroke-width': 8, fill: 'none' }));
        canvas.appendChild(svg('ellipse', { cx: 280, cy: 240, rx: 60, ry: 80, fill: '#4caf50', opacity: 0.85 }));
        canvas.appendChild(svg('rect', { x: 273, y: 238, width: 14, height: 82, fill: '#6b4f2b' }));
        canvas.appendChild(svg('rect', { x: 380, y: 336, width: 200, height: 32, fill: '#6aaee6', opacity: 0.65 }));

        const stageIndex = stageController.getActiveIndex();
        const precipitationStrength = Math.max(0, state.humidity + (state.season === 'Spring' ? 10 : state.season === 'Winter' ? 8 : 0) - state.sun / 2);
        if (precipitationStrength > 25) {
            for (let i = 0; i < Math.round(precipitationStrength / 8); i += 1) {
                const x = 250 + i * 22;
                canvas.appendChild(svg('line', { x1: x, y1: 145, x2: x - 6, y2: 210, stroke: state.temperature < 0 ? '#bfe6ff' : '#1e90ff', 'stroke-width': 3, opacity: 0.7 }));
            }
        }

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
                canvas.appendChild(svg('text', { x: position.x + 10, y: position.y - 8, 'font-size': 12, fill: '#12456f', 'font-weight': 700 }, stageController.getStageData(stageIndex).name));
            }
        });

        updateReadouts();
    }

    function tick() {
        if (state.playing) frame += 1 + state.sun / 100 + state.temperature / 80;
        render();
        requestAnimationFrame(tick);
    }

    [['input', el.sun, 'sun'], ['input', el.temp, 'temperature'], ['input', el.humidity, 'humidity'], ['change', el.season, 'season']].forEach(([type, node, key]) => {
        node?.addEventListener(type, (event) => {
            state[key] = type === 'change' ? event.target.value : Number(event.target.value);
            render();
        });
    });
    el.toggle?.addEventListener('click', () => {
        state.playing = !state.playing;
        el.toggle.textContent = state.playing ? 'Pause Cycle' : 'Resume Cycle';
    });
    el.reset?.addEventListener('click', () => {
        state.sun = 65;
        state.temperature = 24;
        state.humidity = 55;
        state.season = 'Summer';
        state.playing = true;
        el.sun.value = '65';
        el.temp.value = '24';
        el.humidity.value = '55';
        el.season.value = 'Summer';
        el.toggle.textContent = 'Pause Cycle';
        render();
    });

    tick();
}

function initTranspirationExplorer() {
    const canvas = document.getElementById('transpiration-canvas');
    if (!canvas) return;
    canvas.innerHTML = '';
    canvas.appendChild(svg('rect', { x: 0, y: 0, width: 560, height: 280, fill: '#f7fcff' }));
    canvas.appendChild(svg('rect', { x: 0, y: 180, width: 560, height: 100, fill: '#c4b08b' }));
    canvas.appendChild(svg('ellipse', { cx: 240, cy: 110, rx: 78, ry: 94, fill: '#4caf50', opacity: 0.85 }));
    canvas.appendChild(svg('rect', { x: 230, y: 112, width: 18, height: 94, fill: '#6b4f2b' }));
    ['170,205 115,255', '240,205 205,260', '245,205 285,260', '310,205 360,252'].forEach((points) => {
        canvas.appendChild(svg('line', { x1: points.split(' ')[0].split(',')[0], y1: points.split(' ')[0].split(',')[1], x2: points.split(' ')[1].split(',')[0], y2: points.split(' ')[1].split(',')[1], stroke: '#6b4f2b', 'stroke-width': 3 }));
    });
    for (let i = 0; i < 8; i += 1) {
        canvas.appendChild(svg('circle', { cx: 150 + i * 25, cy: 245 - (i % 2) * 12, r: 5, fill: '#1e90ff', opacity: 0.8 }));
        canvas.appendChild(svg('circle', { cx: 215 + i * 18, cy: 80 - (i % 3) * 10, r: 5, fill: '#ffffff', opacity: 0.9 }));
    }
    canvas.appendChild(svg('path', { d: 'M 165 242 Q 215 180 240 130 Q 260 90 280 50', stroke: '#2f9df4', 'stroke-width': 4, fill: 'none', 'stroke-dasharray': '8 6' }));
    canvas.appendChild(svg('text', { x: 55, y: 250, 'font-size': 13, fill: '#12456f', 'font-weight': 700 }, 'Roots absorb water'));
    canvas.appendChild(svg('text', { x: 295, y: 130, 'font-size': 13, fill: '#12456f', 'font-weight': 700 }, 'Water travels upward'));
    canvas.appendChild(svg('text', { x: 335, y: 45, 'font-size': 13, fill: '#12456f', 'font-weight': 700 }, 'Leaves release vapor'));
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

    function loadFullResolution(lang) {
        const target = DIAGRAM_SOURCES[lang];
        loading.hidden = false;
        const probe = new Image();
        probe.onload = () => {
            img.src = target.src;
            img.alt = target.alt;
            state.loadedFull = true;
            loading.hidden = true;
        };
        probe.onerror = () => {
            loading.textContent = 'Could not load the high-resolution diagram. Check your connection and try again.';
        };
        probe.src = target.src;
    }

    document.getElementById('usgs-zoom-in-btn')?.addEventListener('click', () => setZoom(state.zoom + ZOOM_STEP));
    document.getElementById('usgs-zoom-out-btn')?.addEventListener('click', () => setZoom(state.zoom - ZOOM_STEP));
    document.getElementById('usgs-zoom-reset-btn')?.addEventListener('click', resetView);

    document.getElementById('usgs-load-full-btn')?.addEventListener('click', (event) => {
        loadFullResolution(state.lang);
        event.target.disabled = true;
        event.target.textContent = 'Loading…';
    });

    document.getElementById('usgs-lang-toggle-btn')?.addEventListener('click', (event) => {
        state.lang = state.lang === 'en' ? 'es' : 'en';
        event.target.textContent = state.lang === 'en' ? 'Español' : 'English';
        if (state.loadedFull) loadFullResolution(state.lang);
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
}

function initKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
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
