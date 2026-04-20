document.addEventListener('DOMContentLoaded', () => {
    initStepSelector();
    initDiagrams();
    initSimulation();
    initQuiz();
    initScavengerHunt();
    initContentsToggle();
    initSmoothScroll();
    initKeyboardNavigation();
});

const SVG_NS = 'http://www.w3.org/2000/svg';

function initStepSelector() {
    const stepButtons = Array.from(document.querySelectorAll('.step-btn'));
    const chips = Array.from(document.querySelectorAll('.breadcrumb-chip'));

    function activateStep(stepNumber) {
        stepButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.step === stepNumber));
        document.querySelectorAll('.step-explanation').forEach((exp) => {
            exp.style.display = exp.id === `step-${stepNumber}` ? 'block' : 'none';
        });
        chips.forEach((chip, index) => chip.classList.toggle('active', index === Math.min(Number(stepNumber) - 1, chips.length - 1)));
    }

    stepButtons.forEach((button) => {
        button.addEventListener('click', () => activateStep(button.dataset.step));
    });

    activateStep('1');
}

function initDiagrams() {
    document.querySelectorAll('.interactive-diagram').forEach((svg) => {
        buildDiagramOverlay(svg);
        svg.addEventListener('mouseenter', () => svg.classList.add('is-active'));
        svg.addEventListener('mouseleave', () => svg.classList.remove('is-active'));
        svg.addEventListener('click', () => animateDiagram(svg));
    });

    const stepPathButton = document.getElementById('step-light-path-btn');
    if (stepPathButton) {
        stepPathButton.addEventListener('click', () => {
            const active = document.querySelector('.step-btn.active')?.dataset.step;
            const svg = document.querySelector(`[data-step-diagram="${active}"]`);
            if (svg) animateDiagram(svg);
        });
    }

    document.querySelectorAll('[data-diagram-action]').forEach((button) => {
        button.addEventListener('click', () => {
            const svg = document.querySelector(`[data-diagram="${button.dataset.diagramAction}"]`);
            if (svg) animateDiagram(svg);
        });
    });
}

function buildDiagramOverlay(svg) {
    const box = svg.viewBox.baseVal;
    const overlay = document.createElementNS(SVG_NS, 'g');
    overlay.setAttribute('class', 'diagram-overlay');
    const kind = svg.dataset.stepDiagram || svg.dataset.diagram;

    const configs = {
        '1': { path: `M 32 35 Q 56 58 80 90`, angle: { x: 115, y: 86, text: 'Entry refraction' }, labels: [{ x: 20, y: 18, text: 'Sunlight' }, { x: 100, y: 150, text: 'Water droplet' }] },
        '2': { path: `M 100 65 Q 116 95 126 130`, angle: { x: 126, y: 78, text: 'Red bends less' }, labels: [{ x: 137, y: 115, text: 'Red ray' }, { x: 130, y: 148, text: 'Violet bends more' }] },
        '3': { path: `M 100 65 L 125 125 L 95 150`, angle: { x: 132, y: 112, text: 'Internal reflection' }, labels: [{ x: 132, y: 138, text: 'Bounce point' }] },
        '4': { path: `M 80 70 Q 96 56 110 47`, angle: { x: 163, y: 18, text: '42° red' }, labels: [{ x: 150, y: 24, text: 'Primary rainbow' }, { x: 144, y: 140, text: '40° violet' }] },
        geometry: { path: `M 260 50 Q 168 125 100 140`, angle: { x: 76, y: 181, text: '42° to your eye' }, labels: [{ x: 229, y: 44, text: 'Sun behind you' }, { x: 103, y: 64, text: 'Primary arc' }] },
        double: { path: `M 360 40 Q 250 112 180 80`, angle: { x: 103, y: 137, text: '42° primary' }, labels: [{ x: 146, y: 171, text: '50-53° secondary' }, { x: 78, y: 111, text: 'Brighter primary' }] }
    };

    const config = configs[kind];
    if (!config) return;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', config.path);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#ffffff');
    path.setAttribute('stroke-width', '4');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-dasharray', '12 8');
    path.setAttribute('class', 'diagram-overlay-path');
    overlay.appendChild(path);

    const angle = document.createElementNS(SVG_NS, 'text');
    angle.setAttribute('x', config.angle.x);
    angle.setAttribute('y', config.angle.y);
    angle.setAttribute('class', 'diagram-angle diagram-label');
    angle.textContent = config.angle.text;
    overlay.appendChild(angle);

    config.labels.forEach((item) => {
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', item.x);
        text.setAttribute('y', item.y);
        text.setAttribute('class', 'diagram-label');
        text.textContent = item.text;
        overlay.appendChild(text);
    });

    const frame = document.createElementNS(SVG_NS, 'rect');
    frame.setAttribute('x', 4);
    frame.setAttribute('y', 4);
    frame.setAttribute('width', Math.max(0, box.width - 8));
    frame.setAttribute('height', Math.max(0, box.height - 8));
    frame.setAttribute('fill', 'none');
    frame.setAttribute('stroke', '#6ec5ff');
    frame.setAttribute('stroke-width', '2');
    frame.setAttribute('rx', '8');
    frame.setAttribute('opacity', '0.45');
    frame.setAttribute('class', 'diagram-overlay-path');
    overlay.appendChild(frame);

    svg.appendChild(overlay);
}

function animateDiagram(svg) {
    svg.classList.add('is-active');
    const path = svg.querySelector('.diagram-overlay-path');
    if (path) {
        const length = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 300;
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration: 1100, easing: 'ease-out' });
        setTimeout(() => {
            path.style.strokeDashoffset = '0';
        }, 1100);
    }
    setTimeout(() => svg.classList.remove('is-active'), 1800);
}

function initSimulation() {
    const canvas = document.getElementById('simulation-canvas');
    if (!canvas) return;

    const elements = {
        sunHeightSlider: document.getElementById('sun-height-slider'),
        observerPositionSlider: document.getElementById('observer-position-slider'),
        rainDensitySlider: document.getElementById('rain-density-slider'),
        doubleToggle: document.getElementById('double-rainbow-toggle'),
        labelsToggle: document.getElementById('labels-toggle'),
        animateBtn: document.getElementById('animate-btn'),
        resetBtn: document.getElementById('reset-btn'),
        sunHeightValue: document.getElementById('sun-height-value'),
        observerPositionValue: document.getElementById('observer-position-value'),
        rainDensityValue: document.getElementById('rain-density-value'),
        primaryAngleReadout: document.getElementById('primary-angle-readout'),
        secondaryAngleReadout: document.getElementById('secondary-angle-readout'),
        legend: document.getElementById('color-legend-items')
    };

    const state = {
        sunHeight: 45,
        observerPosition: 20,
        rainDensity: 55,
        showDouble: false,
        showLabels: true,
        isAnimating: false
    };

    const dom = createSimulationScene(canvas);

    elements.sunHeightSlider.addEventListener('input', (event) => {
        state.sunHeight = Number(event.target.value);
        elements.sunHeightValue.textContent = `${state.sunHeight}`;
        drawSimulation();
    });
    elements.observerPositionSlider.addEventListener('input', (event) => {
        state.observerPosition = Number(event.target.value);
        elements.observerPositionValue.textContent = `${state.observerPosition}`;
        drawSimulation();
    });
    elements.rainDensitySlider.addEventListener('input', (event) => {
        state.rainDensity = Number(event.target.value);
        elements.rainDensityValue.textContent = `${state.rainDensity}`;
        drawSimulation();
    });
    elements.doubleToggle.addEventListener('change', (event) => {
        state.showDouble = event.target.checked;
        drawSimulation();
    });
    elements.labelsToggle.addEventListener('change', (event) => {
        state.showLabels = event.target.checked;
        drawSimulation();
    });
    elements.animateBtn.addEventListener('click', () => {
        if (!state.isAnimating) animateLightPath(canvas, dom, state, elements.animateBtn);
    });
    elements.resetBtn.addEventListener('click', () => {
        state.sunHeight = 45;
        state.observerPosition = 20;
        state.rainDensity = 55;
        state.showDouble = false;
        state.showLabels = true;
        elements.sunHeightSlider.value = '45';
        elements.observerPositionSlider.value = '20';
        elements.rainDensitySlider.value = '55';
        elements.doubleToggle.checked = false;
        elements.labelsToggle.checked = true;
        elements.sunHeightValue.textContent = '45';
        elements.observerPositionValue.textContent = '20';
        elements.rainDensityValue.textContent = '55';
        drawSimulation();
    });

    buildLegend(elements.legend);
    drawSimulation();

    function drawSimulation() {
        pulseUpdate(canvas);
        const width = 500;
        const height = 400;
        const groundY = 320;
        const observerX = 40 + (state.observerPosition / 100) * 160;
        const observerY = groundY;
        const sunRadius = 22;
        const sunDistance = 180;
        const sunAngle = (state.sunHeight * Math.PI) / 180;
        const sunX = observerX + sunDistance * Math.cos(sunAngle);
        const sunY = observerY - sunDistance * Math.sin(sunAngle) - 40;
        const primaryRed = 42;
        const primaryViolet = 40;
        const primaryRadius = 104 + ((55 - state.sunHeight) * 0.7);
        const secondaryRadius = primaryRadius + 32;
        const centerX = observerX;
        const centerY = observerY - 18;

        dom.sun.setAttribute('cx', `${sunX}`);
        dom.sun.setAttribute('cy', `${sunY}`);
        dom.sunLabel.setAttribute('x', `${sunX}`);
        dom.sunLabel.setAttribute('y', `${sunY + 38}`);
        dom.head.setAttribute('cx', `${observerX}`);
        dom.head.setAttribute('cy', `${observerY - 38}`);
        dom.body.setAttribute('x1', `${observerX}`);
        dom.body.setAttribute('y1', `${observerY - 30}`);
        dom.body.setAttribute('x2', `${observerX}`);
        dom.body.setAttribute('y2', `${observerY}`);
        dom.arms.setAttribute('x1', `${observerX - 14}`);
        dom.arms.setAttribute('y1', `${observerY - 18}`);
        dom.arms.setAttribute('x2', `${observerX + 14}`);
        dom.arms.setAttribute('y2', `${observerY - 18}`);
        dom.legLeft.setAttribute('x1', `${observerX}`);
        dom.legLeft.setAttribute('y1', `${observerY}`);
        dom.legLeft.setAttribute('x2', `${observerX - 10}`);
        dom.legLeft.setAttribute('y2', `${observerY + 18}`);
        dom.legRight.setAttribute('x1', `${observerX}`);
        dom.legRight.setAttribute('y1', `${observerY}`);
        dom.legRight.setAttribute('x2', `${observerX + 10}`);
        dom.legRight.setAttribute('y2', `${observerY + 18}`);
        dom.observerLabel.setAttribute('x', `${observerX}`);
        dom.observerLabel.setAttribute('y', `${observerY + 34}`);

        const rainDrops = Math.max(10, Math.round(state.rainDensity / 3));
        dom.rainLayer.innerHTML = '';
        for (let index = 0; index < rainDrops; index += 1) {
            const drop = document.createElementNS(SVG_NS, 'line');
            const column = index % 10;
            const row = Math.floor(index / 10);
            const x = 250 + column * 22 + (row % 2) * 6;
            const y = 110 + row * 18;
            drop.setAttribute('x1', `${x}`);
            drop.setAttribute('y1', `${y}`);
            drop.setAttribute('x2', `${x - 5}`);
            drop.setAttribute('y2', `${y + 18}`);
            drop.setAttribute('stroke', '#79bceb');
            drop.setAttribute('stroke-width', `${1 + state.rainDensity / 85}`);
            drop.setAttribute('opacity', `${0.35 + state.rainDensity / 160}`);
            dom.rainLayer.appendChild(drop);
        }

        dom.primaryBow.setAttribute('d', arcPath(centerX, centerY, primaryRadius, 222, 318));
        dom.secondaryBow.setAttribute('d', arcPath(centerX, centerY, secondaryRadius, 220, 320));
        dom.secondaryBow.style.display = state.showDouble ? 'inline' : 'none';

        dom.primaryLabel.setAttribute('x', `${observerX + primaryRadius - 14}`);
        dom.primaryLabel.setAttribute('y', `${observerY - primaryRadius + 8}`);
        dom.secondaryLabel.setAttribute('x', `${observerX + secondaryRadius - 18}`);
        dom.secondaryLabel.setAttribute('y', `${observerY - secondaryRadius + 18}`);
        dom.secondaryLabel.style.display = state.showDouble && state.showLabels ? 'inline' : 'none';

        const labelDisplay = state.showLabels ? 'inline' : 'none';
        [dom.sunLabel, dom.observerLabel, dom.primaryLabel, dom.anglePrimary, dom.angleSecondary, dom.rainLabel].forEach((node) => {
            node.style.display = labelDisplay;
        });

        dom.rainLabel.setAttribute('x', '348');
        dom.rainLabel.setAttribute('y', '300');
        dom.anglePrimary.setAttribute('x', `${observerX + 52}`);
        dom.anglePrimary.setAttribute('y', `${observerY - 98}`);
        dom.angleSecondary.setAttribute('x', `${observerX + 65}`);
        dom.angleSecondary.setAttribute('y', `${observerY - 133}`);
        dom.angleSecondary.style.display = state.showLabels && state.showDouble ? 'inline' : 'none';

        elements.primaryAngleReadout.textContent = `${primaryRed}° red, ${primaryViolet}° violet`;
        elements.secondaryAngleReadout.textContent = state.showDouble ? '50-53° reversed colors' : 'Turn on double rainbow to compare';
    }
}

function createSimulationScene(canvas) {
    canvas.innerHTML = '';
    const defs = document.createElementNS(SVG_NS, 'defs');
    defs.innerHTML = `
        <linearGradient id="simRainbow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ff0000"></stop>
            <stop offset="16.67%" stop-color="#ff7f00"></stop>
            <stop offset="33.33%" stop-color="#ffff00"></stop>
            <stop offset="50%" stop-color="#00ff00"></stop>
            <stop offset="66.67%" stop-color="#0000ff"></stop>
            <stop offset="83.33%" stop-color="#4b0082"></stop>
            <stop offset="100%" stop-color="#9400d3"></stop>
        </linearGradient>
        <linearGradient id="simRainbowReverse" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#ff0000"></stop>
            <stop offset="16.67%" stop-color="#ff7f00"></stop>
            <stop offset="33.33%" stop-color="#ffff00"></stop>
            <stop offset="50%" stop-color="#00ff00"></stop>
            <stop offset="66.67%" stop-color="#0000ff"></stop>
            <stop offset="83.33%" stop-color="#4b0082"></stop>
            <stop offset="100%" stop-color="#9400d3"></stop>
        </linearGradient>
    `;
    canvas.appendChild(defs);

    const sky = svgNode('rect', { x: 0, y: 0, width: 500, height: 400, fill: 'url(#skyGradient)' });
    sky.setAttribute('fill', '#e8f4f8');
    const ground = svgNode('rect', { x: 0, y: 320, width: 500, height: 80, fill: '#d5c08a', opacity: 0.45 });
    const groundLine = svgNode('line', { x1: 0, y1: 320, x2: 500, y2: 320, stroke: '#90784f', 'stroke-width': 3 });
    const rainLayer = svgNode('g');
    const primaryBow = svgNode('path', { stroke: 'url(#simRainbow)', 'stroke-width': 14, fill: 'none', 'stroke-linecap': 'round' });
    const secondaryBow = svgNode('path', { stroke: 'url(#simRainbowReverse)', 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round', opacity: 0.55, 'stroke-dasharray': '10 8' });
    const sun = svgNode('circle', { r: 22, fill: '#ffd54f', opacity: 0.95 });
    const sunLabel = svgNode('text', { 'text-anchor': 'middle', 'font-size': 11, fill: '#333' }, 'Sun');
    const head = svgNode('circle', { r: 8, fill: '#263238' });
    const body = svgNode('line', { stroke: '#263238', 'stroke-width': 3 });
    const arms = svgNode('line', { stroke: '#263238', 'stroke-width': 3 });
    const legLeft = svgNode('line', { stroke: '#263238', 'stroke-width': 3 });
    const legRight = svgNode('line', { stroke: '#263238', 'stroke-width': 3 });
    const observerLabel = svgNode('text', { 'text-anchor': 'middle', 'font-size': 11, fill: '#333' }, 'Observer');
    const rainLabel = svgNode('text', { 'text-anchor': 'middle', 'font-size': 11, fill: '#333' }, 'Rain zone');
    const primaryLabel = svgNode('text', { 'font-size': 12, fill: '#ff0000', 'font-weight': 700 }, 'Primary');
    const secondaryLabel = svgNode('text', { 'font-size': 12, fill: '#5d6d7e', 'font-weight': 700 }, 'Secondary');
    const anglePrimary = svgNode('text', { 'font-size': 11, fill: '#ff0000', 'font-weight': 700 }, '42°');
    const angleSecondary = svgNode('text', { 'font-size': 11, fill: '#5d6d7e', 'font-weight': 700 }, '50-53°');

    [sky, ground, groundLine, rainLayer, primaryBow, secondaryBow, sun, sunLabel, head, body, arms, legLeft, legRight, observerLabel, rainLabel, primaryLabel, secondaryLabel, anglePrimary, angleSecondary].forEach((node) => {
        canvas.appendChild(node);
    });

    return { rainLayer, primaryBow, secondaryBow, sun, sunLabel, head, body, arms, legLeft, legRight, observerLabel, rainLabel, primaryLabel, secondaryLabel, anglePrimary, angleSecondary };
}

function animateLightPath(canvas, dom, state, animateBtn) {
    state.isAnimating = true;
    animateBtn.disabled = true;
    const ray = svgNode('path', {
        fill: 'none',
        stroke: '#ffffff',
        'stroke-width': 4,
        'stroke-linecap': 'round'
    });
    const observerX = 40 + (state.observerPosition / 100) * 160;
    const observerY = 302;
    const sunDistance = 180;
    const sunAngle = (state.sunHeight * Math.PI) / 180;
    const sunX = observerX + sunDistance * Math.cos(sunAngle);
    const sunY = observerY - sunDistance * Math.sin(sunAngle) - 40;
    const dropletX = 328;
    const dropletY = 180;
    const pathData = `M ${sunX} ${sunY} Q 320 120 ${dropletX} ${dropletY} Q 300 205 ${observerX + 28} ${observerY - 72}`;
    ray.setAttribute('d', pathData);
    canvas.appendChild(ray);
    const length = ray.getTotalLength();
    ray.style.strokeDasharray = `${length}`;
    ray.style.strokeDashoffset = `${length}`;

    ray.animate(
        [{ strokeDashoffset: length, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }, { strokeDashoffset: 0, opacity: 0 }],
        { duration: 2200, easing: 'ease-in-out' }
    );

    setTimeout(() => {
        ray.remove();
        state.isAnimating = false;
        animateBtn.disabled = false;
    }, 2200);
}

function buildLegend(container) {
    if (!container) return;
    const items = [
        ['#ff0000', 'Red 42°'],
        ['#ff7f00', 'Orange 41.5°'],
        ['#ffff00', 'Yellow 41°'],
        ['#00c853', 'Green 40.8°'],
        ['#2979ff', 'Blue 40.5°'],
        ['#4b0082', 'Indigo 40.2°'],
        ['#9400d3', 'Violet 40°']
    ];
    container.innerHTML = '';
    items.forEach(([color, label]) => {
        const chip = document.createElement('div');
        chip.className = 'legend-chip';
        chip.innerHTML = `<span class="legend-swatch" style="background:${color}"></span><span>${label}</span>`;
        container.appendChild(chip);
    });
}

function pulseUpdate(canvas) {
    canvas.classList.add('is-updating');
    setTimeout(() => canvas.classList.remove('is-updating'), 220);
}

function initQuiz() {
    const questions = [
        {
            question: 'What must be behind you for you to see a rainbow?',
            answers: ['The Moon', 'The Sun', 'A mountain', 'A cloud'],
            correct: 1,
            explanation: 'A rainbow appears when sunlight is behind you and raindrops are in front of you.'
        },
        {
            question: 'Which color bends the least when entering a raindrop?',
            answers: ['Violet', 'Blue', 'Red', 'Green'],
            correct: 2,
            explanation: 'Red refracts the least, so it ends up on the outside of the primary rainbow.'
        },
        {
            question: 'What is the bending of light called when it enters water?',
            answers: ['Reflection', 'Refraction', 'Dispersion', 'Absorption'],
            correct: 1,
            explanation: 'Refraction is the change in direction caused by light moving between materials.'
        },
        {
            question: 'Why is a secondary rainbow dimmer?',
            answers: ['It is farther away', 'It needs more reflections', 'It uses moonlight', 'It contains fewer colors'],
            correct: 1,
            explanation: 'A secondary rainbow forms after two internal reflections, so more light is lost before it reaches your eyes.'
        },
        {
            question: 'Which acronym helps remember the rainbow colors?',
            answers: ['ROYGBIV', 'ROYGBV', 'ROGBIV', 'RGBIV'],
            correct: 0,
            explanation: 'ROYGBIV stands for red, orange, yellow, green, blue, indigo, violet.'
        },
        {
            question: 'At what angle is the primary rainbow strongest?',
            answers: ['30°', '42°', '60°', '90°'],
            correct: 1,
            explanation: 'Primary rainbow light reaches your eye most strongly at about 42° from the antisolar point.'
        },
        {
            question: 'What is reversed in a secondary rainbow?',
            answers: ['Brightness', 'Position of the Sun', 'Color order', 'Shape of the arc'],
            correct: 2,
            explanation: 'The secondary bow has reversed colors because the light reflects twice inside the droplet.'
        }
    ];

    const questionsContainer = document.getElementById('quiz-questions');
    const resultsContainer = document.getElementById('quiz-results');
    const scoreCounter = document.getElementById('quiz-score-counter');
    const progressLabel = document.getElementById('quiz-progress-label');
    const progressBar = document.getElementById('quiz-progress-bar');
    const scoreMessage = document.getElementById('score-message');
    const retakeBtn = document.getElementById('retake-quiz-btn');

    let current = 0;
    let score = 0;
    let locked = false;

    function updateHeader() {
        scoreCounter.textContent = `${score}/${questions.length} correct`;
        progressLabel.textContent = current < questions.length ? `Question ${current + 1} of ${questions.length}` : 'Quiz complete';
        progressBar.style.width = `${(current / questions.length) * 100}%`;
    }

    function renderQuestion() {
        const item = questions[current];
        questionsContainer.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'quiz-question';
        card.innerHTML = `<h4>Question ${current + 1}</h4><p>${item.question}</p>`;
        const answers = document.createElement('div');
        answers.className = 'answer-options';
        const feedback = document.createElement('div');
        feedback.className = 'answer-feedback';
        feedback.hidden = true;

        item.answers.forEach((answer, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'answer-btn';
            button.textContent = answer;
            button.addEventListener('click', () => {
                if (locked) return;
                locked = true;
                const isCorrect = index === item.correct;
                if (isCorrect) score += 1;
                Array.from(answers.children).forEach((child, childIndex) => {
                    child.disabled = true;
                    if (childIndex === item.correct) child.classList.add('correct');
                    if (childIndex === index && !isCorrect) child.classList.add('incorrect');
                });
                feedback.hidden = false;
                feedback.textContent = `${isCorrect ? 'Correct.' : 'Not quite.'} ${item.explanation}`;
                updateHeader();
                setTimeout(() => {
                    current += 1;
                    locked = false;
                    if (current < questions.length) {
                        renderQuestion();
                        updateHeader();
                    } else {
                        showResults();
                    }
                }, 1800);
            });
            answers.appendChild(button);
        });

        card.appendChild(answers);
        card.appendChild(feedback);
        questionsContainer.appendChild(card);
    }

    function showResults() {
        questionsContainer.style.display = 'none';
        resultsContainer.style.display = 'block';
        progressBar.style.width = '100%';
        progressLabel.textContent = 'Quiz complete';
        const percent = Math.round((score / questions.length) * 100);
        scoreMessage.textContent = percent === 100
            ? `Perfect score: ${score}/${questions.length}.`
            : percent >= 80
                ? `Excellent work: ${score}/${questions.length}.`
                : percent >= 60
                    ? `Nice job: ${score}/${questions.length}. Review the diagrams and try again.`
                    : `You scored ${score}/${questions.length}. Revisit the simulation and explanations, then retake it.`;
    }

    retakeBtn?.addEventListener('click', () => {
        current = 0;
        score = 0;
        locked = false;
        resultsContainer.style.display = 'none';
        questionsContainer.style.display = 'block';
        renderQuestion();
        updateHeader();
    });

    renderQuestion();
    updateHeader();
}

function initScavengerHunt() {
    const answers = [
        {
            test: (value) => includesAll(value, ['sunlight', 'bend', 'bounce', 'color']) || includesAll(value, ['sunlight', 'refraction', 'reflection', 'dispersion']),
            explanation: 'A strong answer names the sequence: sunlight enters, bends, bounces, and colors separate.'
        },
        {
            test: (value) => value.includes('behind') && value.includes('sun'),
            explanation: 'The Sun must be behind you while the rain is in front.'
        },
        {
            test: (value) => value.includes('reflect') && (value.includes('twice') || value.includes('more') || value.includes('second')),
            explanation: 'The secondary bow is dimmer because the light reflects twice, losing intensity.'
        },
        {
            test: (value) => value.includes('violet'),
            explanation: 'Violet bends the most, which places it on the inside of the primary rainbow.'
        },
        {
            test: (value) => value.includes('violet'),
            explanation: 'In the secondary rainbow, violet ends up on the outside because the colors reverse.'
        }
    ];

    const scoreCounter = document.getElementById('scavenger-score-counter');
    const progressLabel = document.getElementById('scavenger-progress-label');
    const progressBar = document.getElementById('scavenger-progress-bar');
    const solved = new Set();

    document.querySelectorAll('[data-hunt-check]').forEach((button) => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.huntCheck);
            const input = document.querySelector(`.hunt-input[data-hunt="${index}"]`);
            const feedback = document.getElementById(`hunt-feedback-${index}`);
            const value = (input?.value || '').trim().toLowerCase();
            const correct = answers[index].test(value);
            feedback.className = `hunt-feedback ${correct ? 'correct' : 'incorrect'}`;
            feedback.textContent = `${correct ? 'Correct.' : 'Try again.'} ${answers[index].explanation}`;
            if (correct) solved.add(index);
            updateScavengerUI(solved.size, answers.length, scoreCounter, progressLabel, progressBar);
        });
    });

    updateScavengerUI(0, answers.length, scoreCounter, progressLabel, progressBar);
}

function updateScavengerUI(score, total, scoreCounter, progressLabel, progressBar) {
    scoreCounter.textContent = `${score}/${total} correct`;
    progressLabel.textContent = score === total ? 'All challenges solved' : `Solved ${score} of ${total}`;
    progressBar.style.width = `${(score / total) * 100}%`;
}

function initContentsToggle() {
    const toggle = document.getElementById('toc-toggle');
    const toc = document.getElementById('rainbow-toc');
    if (!toggle || !toc) return;
    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        toc.classList.toggle('is-open', !expanded);
    });
}

function initSmoothScroll() {
    document.querySelectorAll('.table-of-contents a').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function initKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const buttons = Array.from(document.querySelectorAll('.step-btn'));
        const activeIndex = buttons.findIndex((btn) => btn.classList.contains('active'));
        if (activeIndex === -1) return;
        const nextIndex = event.key === 'ArrowRight'
            ? (activeIndex + 1) % buttons.length
            : (activeIndex - 1 + buttons.length) % buttons.length;
        buttons[nextIndex].click();
    });
}

function arcPath(cx, cy, radius, startDeg, endDeg) {
    const start = polarToCartesian(cx, cy, radius, endDeg);
    const end = polarToCartesian(cx, cy, radius, startDeg);
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx, cy, radius, angleDeg) {
    const radians = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function svgNode(tag, attrs = {}, text = '') {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
}

function includesAll(value, parts) {
    return parts.every((part) => value.includes(part));
}
