// ========================================
// WATER CYCLE LESSON PAGE - JAVASCRIPT
// ========================================

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', () => {
    initStageSelector();
    initSimulation();
    initQuiz();
});

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (window.drawSimulationInstance) window.drawSimulationInstance();
    }, 100);
});

// ========== STAGE SELECTOR LOGIC ==========

function initStageSelector() {
    const stageButtons = document.querySelectorAll('.stage-btn');

    stageButtons.forEach(button => {
        button.addEventListener('click', () => {
            const stageNumber = button.getAttribute('data-stage');

            // Remove active class from all buttons
            stageButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Hide all stage explanations
            document.querySelectorAll('.stage-explanation').forEach(exp => {
                exp.style.display = 'none';
            });

            // Show selected stage explanation
            const selectedStage = document.getElementById(`stage-${stageNumber}`);
            if (selectedStage) {
                selectedStage.style.display = 'block';
            }
        });
    });
}

// ========== SIMULATION LOGIC ==========

function initSimulation() {
    const canvas = document.getElementById('simulation-canvas');
    const sunStrengthSlider = document.getElementById('sun-strength-slider');
    const sunStrengthValue = document.getElementById('sun-strength-value');
    const temperatureSlider = document.getElementById('temperature-slider');
    const temperatureValue = document.getElementById('temperature-value');
    const groundwaterToggle = document.getElementById('groundwater-toggle');
    const plantsToggle = document.getElementById('plants-toggle');
    const rainBtn = document.getElementById('rain-btn');
    const animateBtn = document.getElementById('animate-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Initial simulation state
    let simulationState = {
        sunStrength: 50,
        temperature: 20,
        showGroundwater: false,
        showPlants: false,
        isAnimating: false,
        isRaining: false
    };

    // Update display values on slider changes
    sunStrengthSlider.addEventListener('input', (e) => {
        simulationState.sunStrength = parseInt(e.target.value);
        sunStrengthValue.textContent = simulationState.sunStrength;
        drawSimulation();
    });

    temperatureSlider.addEventListener('input', (e) => {
        simulationState.temperature = parseInt(e.target.value);
        temperatureValue.textContent = simulationState.temperature;
        drawSimulation();
    });

    groundwaterToggle.addEventListener('change', (e) => {
        simulationState.showGroundwater = e.target.checked;
        drawSimulation();
    });

    plantsToggle.addEventListener('change', (e) => {
        simulationState.showPlants = e.target.checked;
        drawSimulation();
    });

    rainBtn.addEventListener('click', () => {
        if (!simulationState.isRaining) {
            startRain();
        }
    });

    animateBtn.addEventListener('click', () => {
        if (!simulationState.isAnimating) {
            animateCycle();
        }
    });

    resetBtn.addEventListener('click', () => {
        sunStrengthSlider.value = 50;
        simulationState.sunStrength = 50;
        sunStrengthValue.textContent = '50';
        temperatureSlider.value = 20;
        simulationState.temperature = 20;
        temperatureValue.textContent = '20';
        groundwaterToggle.checked = false;
        simulationState.showGroundwater = false;
        plantsToggle.checked = false;
        simulationState.showPlants = false;
        canvas.innerHTML = '';
        drawSimulation();
    });

    function drawSimulation() {
        window.drawSimulationInstance = drawSimulation;
        canvas.innerHTML = '';

        const width = canvas.clientWidth || 600;
        const height = canvas.clientHeight || 450;

        // Draw sky background (gradient based on temperature)
        const skyColor = simulationState.temperature > 25 ? '#FFE4B5' : '#87CEEB';
        const sky = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        sky.setAttribute('width', width);
        sky.setAttribute('height', height * 0.6);
        sky.setAttribute('fill', skyColor);
        canvas.appendChild(sky);

        // Draw ground
        const groundColor = simulationState.showGroundwater ? '#D2B48C' : '#8B7355';
        const ground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        ground.setAttribute('y', height * 0.6);
        ground.setAttribute('width', width);
        ground.setAttribute('height', height * 0.4);
        ground.setAttribute('fill', groundColor);
        canvas.appendChild(ground);

        // Draw sun
        const sunOpacity = 0.4 + (simulationState.sunStrength / 100) * 0.6;
        const sun = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        sun.setAttribute('cx', width - 80);
        sun.setAttribute('cy', 60);
        sun.setAttribute('r', '30');
        sun.setAttribute('fill', '#FFD700');
        sun.setAttribute('opacity', sunOpacity);
        canvas.appendChild(sun);

        // Draw sun rays
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = width - 80 + Math.cos(angle) * 45;
            const y1 = 60 + Math.sin(angle) * 45;
            const x2 = width - 80 + Math.cos(angle) * 60;
            const y2 = 60 + Math.sin(angle) * 60;

            const ray = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            ray.setAttribute('x1', x1);
            ray.setAttribute('y1', y1);
            ray.setAttribute('x2', x2);
            ray.setAttribute('y2', y2);
            ray.setAttribute('stroke', '#FFA500');
            ray.setAttribute('stroke-width', '2');
            ray.setAttribute('opacity', sunOpacity * 0.6);
            canvas.appendChild(ray);
        }

        // Draw ocean/water at bottom left
        const ocean = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        ocean.setAttribute('x', '20');
        ocean.setAttribute('y', height * 0.55);
        ocean.setAttribute('width', width * 0.35);
        ocean.setAttribute('height', height * 0.45);
        ocean.setAttribute('fill', '#1E90FF');
        ocean.setAttribute('opacity', '0.7');
        canvas.appendChild(ocean);

        // Evaporation arrows (from water)
        const evaporationCount = Math.ceil(simulationState.sunStrength / 20);
        for (let i = 0; i < evaporationCount; i++) {
            const startX = 50 + i * (width * 0.08);
            const startY = height * 0.55;
            const endX = startX + 20;
            const endY = height * 0.2;

            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pathData = `M ${startX} ${startY} Q ${startX + 15} ${(startY + endY) / 2}, ${endX} ${endY}`;
            arrow.setAttribute('d', pathData);
            arrow.setAttribute('stroke', '#87CEEB');
            arrow.setAttribute('stroke-width', '2');
            arrow.setAttribute('fill', 'none');
            arrow.setAttribute('stroke-dasharray', '5,5');
            arrow.setAttribute('opacity', '0.6');
            canvas.appendChild(arrow);

            // Arrow head
            const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            arrowHead.setAttribute('points', `${endX},${endY} ${endX - 5},${endY + 8} ${endX + 5},${endY + 8}`);
            arrowHead.setAttribute('fill', '#87CEEB');
            arrowHead.setAttribute('opacity', '0.6');
            canvas.appendChild(arrowHead);
        }

        // Draw clouds
        const cloudCount = 2 + Math.ceil(simulationState.sunStrength / 30);
        for (let i = 0; i < cloudCount; i++) {
            const cloudX = 100 + i * (width * 0.25);
            const cloudY = 80 + simulationState.temperature / 5;

            // Cloud body
            const cloud = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            cloud.setAttribute('cx', cloudX);
            cloud.setAttribute('cy', cloudY);
            cloud.setAttribute('rx', '40');
            cloud.setAttribute('ry', '25');
            cloud.setAttribute('fill', '#FFFFFF');
            cloud.setAttribute('opacity', Math.min(0.95, 0.6 + simulationState.sunStrength / 150));
            canvas.appendChild(cloud);

            // Cloud puffs
            const puff1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            puff1.setAttribute('cx', cloudX - 25);
            puff1.setAttribute('cy', cloudY - 5);
            puff1.setAttribute('rx', '25');
            puff1.setAttribute('ry', '20');
            puff1.setAttribute('fill', '#FFFFFF');
            puff1.setAttribute('opacity', Math.min(0.95, 0.6 + simulationState.sunStrength / 150));
            canvas.appendChild(puff1);

            const puff2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            puff2.setAttribute('cx', cloudX + 25);
            puff2.setAttribute('cy', cloudY - 5);
            puff2.setAttribute('rx', '25');
            puff2.setAttribute('ry', '20');
            puff2.setAttribute('fill', '#FFFFFF');
            puff2.setAttribute('opacity', Math.min(0.95, 0.6 + simulationState.sunStrength / 150));
            canvas.appendChild(puff2);
        }

        // Draw precipitation if raining
        if (simulationState.isRaining) {
            drawRaindrops(width);
        }

        // Draw plants (if toggled)
        if (simulationState.showPlants) {
            drawPlants(height);
        }

        // Draw groundwater (if toggled)
        if (simulationState.showGroundwater) {
            drawGroundwater(width, height);
        }

        // Draw mountain
        const mountain = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        mountain.setAttribute('points', `${width * 0.6},${height * 0.6} ${width * 0.75},${height * 0.35} ${width * 0.95},${height * 0.6}`);
        mountain.setAttribute('fill', '#A0826D');
        mountain.setAttribute('opacity', '0.8');
        canvas.appendChild(mountain);

        // Draw river
        const river = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        river.setAttribute('d', `M ${width * 0.75} ${height * 0.35} Q ${width * 0.65} ${height * 0.45}, ${width * 0.35} ${height * 0.58}`);
        river.setAttribute('stroke', '#1E90FF');
        river.setAttribute('stroke-width', '8');
        river.setAttribute('fill', 'none');
        river.setAttribute('opacity', '0.6');
        canvas.appendChild(river);

        // Temperature indicator
        const tempLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tempLabel.setAttribute('x', '10');
        tempLabel.setAttribute('y', '25');
        tempLabel.setAttribute('font-size', '12');
        tempLabel.setAttribute('fill', '#333');
        tempLabel.textContent = `Temp: ${simulationState.temperature}°C`;
        canvas.appendChild(tempLabel);

        // Sun strength indicator
        const sunLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sunLabel.setAttribute('x', width - 120);
        sunLabel.setAttribute('y', '25');
        sunLabel.setAttribute('font-size', '12');
        sunLabel.setAttribute('fill', '#333');
        sunLabel.textContent = `Sun: ${simulationState.sunStrength}%`;
        canvas.appendChild(sunLabel);
    }

    function drawRaindrops(width) {
        const cloudCount = 2 + Math.ceil(simulationState.sunStrength / 30);
        for (let i = 0; i < cloudCount; i++) {
            const cloudX = 100 + i * (width * 0.25);
            const raindropCount = 4 + Math.ceil(simulationState.temperature / 10);
            for (let j = 0; j < raindropCount; j++) {
                const rainX = cloudX - 30 + Math.random() * 60;
                const rainY = 100 + j * 20;

                const drop = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                drop.setAttribute('x1', rainX);
                drop.setAttribute('y1', rainY);
                drop.setAttribute('x2', rainX - 3);
                drop.setAttribute('y2', rainY + 15);
                drop.setAttribute('stroke', '#1E90FF');
                drop.setAttribute('stroke-width', '2');
                drop.setAttribute('opacity', '0.7');
                canvas.appendChild(drop);
            }
        }
    }

    function drawPlants(height) {
        const plantPositions = [250, 350, 450];
        plantPositions.forEach(plantX => {
            // Stem
            const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            stem.setAttribute('x1', plantX);
            stem.setAttribute('y1', height * 0.95);
            stem.setAttribute('x2', plantX);
            stem.setAttribute('y2', height * 0.75);
            stem.setAttribute('stroke', '#228B22');
            stem.setAttribute('stroke-width', '3');
            canvas.appendChild(stem);

            // Leaves
            const leaf1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            leaf1.setAttribute('cx', plantX - 15);
            leaf1.setAttribute('cy', height * 0.85);
            leaf1.setAttribute('rx', '12');
            leaf1.setAttribute('ry', '20');
            leaf1.setAttribute('fill', '#228B22');
            leaf1.setAttribute('opacity', '0.8');
            canvas.appendChild(leaf1);

            const leaf2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            leaf2.setAttribute('cx', plantX + 15);
            leaf2.setAttribute('cy', height * 0.82);
            leaf2.setAttribute('rx', '12');
            leaf2.setAttribute('ry', '20');
            leaf2.setAttribute('fill', '#228B22');
            leaf2.setAttribute('opacity', '0.8');
            canvas.appendChild(leaf2);

            // Water vapor from leaves (transpiration)
            const vaporArrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            vaporArrow.setAttribute('d', `M ${plantX} ${height * 0.72} Q ${plantX + 10} ${height * 0.65}, ${plantX + 5} ${height * 0.55}`);
            vaporArrow.setAttribute('stroke', '#87CEEB');
            vaporArrow.setAttribute('stroke-width', '1.5');
            vaporArrow.setAttribute('fill', 'none');
            vaporArrow.setAttribute('stroke-dasharray', '3,3');
            vaporArrow.setAttribute('opacity', '0.5');
            canvas.appendChild(vaporArrow);
        });
    }

    function drawGroundwater(width, height) {
        // Draw soil layers
        const layerHeight = 15;
        const startY = height * 0.85;
        for (let layer = 0; layer < 4; layer++) {
            const y = startY + layer * layerHeight;
            // Soil particles
            const numParticles = Math.floor(width / 40);
            for (let i = 0; i < numParticles; i++) {
                const x = 20 + i * (width / numParticles);
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', x);
                circle.setAttribute('cy', y);
                circle.setAttribute('r', '2');
                circle.setAttribute('fill', '#8B7355');
                circle.setAttribute('opacity', '0.4');
                canvas.appendChild(circle);
            }
        }

        // Draw groundwater layer at bottom
        const gwLayer = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        gwLayer.setAttribute('x', '20');
        gwLayer.setAttribute('y', height * 0.88);
        gwLayer.setAttribute('width', width - 40);
        gwLayer.setAttribute('height', height * 0.1);
        gwLayer.setAttribute('fill', '#4A90E2');
        gwLayer.setAttribute('opacity', '0.3');
        canvas.appendChild(gwLayer);

        // Label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', width / 2);
        label.setAttribute('y', height * 0.92);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '10');
        label.setAttribute('fill', '#0066CC');
        label.textContent = 'Groundwater';
        canvas.appendChild(label);
    }

    function startRain() {
        simulationState.isRaining = true;
        rainBtn.disabled = true;
        rainBtn.textContent = 'Raining...';

        drawSimulation();

        setTimeout(() => {
            simulationState.isRaining = false;
            rainBtn.disabled = false;
            rainBtn.textContent = 'Start Rain';
            drawSimulation();
        }, 3000);
    }

    function animateCycle() {
        simulationState.isAnimating = true;
        animateBtn.disabled = true;

        // Flash the canvas to show animation
        const originalHTML = canvas.innerHTML;

        const flashElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        flashElement.setAttribute('width', '100%');
        flashElement.setAttribute('height', '100%');
        flashElement.setAttribute('fill', 'white');
        flashElement.setAttribute('opacity', '0.3');
        canvas.appendChild(flashElement);

        setTimeout(() => {
            flashElement.style.transition = 'opacity 0.8s ease';
            flashElement.setAttribute('opacity', '0');

            setTimeout(() => {
                simulationState.isAnimating = false;
                animateBtn.disabled = false;
                flashElement.remove();
                drawSimulation();
            }, 800);
        }, 500);
    }

    // Initial draw
    drawSimulation();
}

// ========== QUIZ LOGIC ==========

function initQuiz() {
    const quizQuestions = [
        {
            question: 'Which process describes water turning from liquid to gas?',
            answers: [
                { text: 'Condensation', correct: false },
                { text: 'Evaporation', correct: true },
                { text: 'Precipitation', correct: false },
                { text: 'Infiltration', correct: false }
            ]
        },
        {
            question: 'What provides energy for the water cycle to work?',
            answers: [
                { text: 'The Moon', correct: false },
                { text: 'Wind', correct: false },
                { text: 'The Sun', correct: true },
                { text: 'Ocean currents', correct: false }
            ]
        },
        {
            question: 'What percentage of Earth\'s water is in the oceans?',
            answers: [
                { text: 'About 50%', correct: false },
                { text: 'About 75%', correct: false },
                { text: 'About 97%', correct: true },
                { text: 'About 99%', correct: false }
            ]
        },
        {
            question: 'Which stage happens when water soaks into the soil?',
            answers: [
                { text: 'Evaporation', correct: false },
                { text: 'Condensation', correct: false },
                { text: 'Collection', correct: false },
                { text: 'Infiltration', correct: true }
            ]
        },
        {
            question: 'What is the process called when plants release water vapor?',
            answers: [
                { text: 'Evaporation', correct: false },
                { text: 'Transpiration', correct: true },
                { text: 'Precipitation', correct: false },
                { text: 'Condensation', correct: false }
            ]
        },
        {
            question: 'At what temperature does water freeze into ice?',
            answers: [
                { text: '10°C', correct: false },
                { text: '0°C', correct: true },
                { text: '50°C', correct: false },
                { text: '100°C', correct: false }
            ]
        },
        {
            question: 'Where is most of Earth\'s freshwater stored?',
            answers: [
                { text: 'In lakes and rivers', correct: false },
                { text: 'In the atmosphere', correct: false },
                { text: 'In glaciers and ice', correct: true },
                { text: 'In oceans', correct: false }
            ]
        },
        {
            question: 'What is water stored beneath Earth\'s surface called?',
            answers: [
                { text: 'Surface water', correct: false },
                { text: 'Groundwater', correct: true },
                { text: 'Atmospheric water', correct: false },
                { text: 'Precipitation', correct: false }
            ]
        }
    ];

    let currentQuestion = 0;
    let score = 0;
    let answered = false;

    const quizQuestionsContainer = document.getElementById('quiz-questions');
    const quizResultsContainer = document.getElementById('quiz-results');

    function displayQuestion() {
        quizQuestionsContainer.innerHTML = '';
        const q = quizQuestions[currentQuestion];

        const questionDiv = document.createElement('div');
        questionDiv.className = 'quiz-question';

        const questionTitle = document.createElement('h4');
        questionTitle.textContent = `Question ${currentQuestion + 1} of ${quizQuestions.length}`;
        questionDiv.appendChild(questionTitle);

        const questionText = document.createElement('p');
        questionText.textContent = q.question;
        questionDiv.appendChild(questionText);

        const answerOptionsDiv = document.createElement('div');
        answerOptionsDiv.className = 'answer-options';

        q.answers.forEach((answer, index) => {
            const answerBtn = document.createElement('button');
            answerBtn.className = 'answer-btn';
            answerBtn.textContent = answer.text;
            answerBtn.onclick = () => selectAnswer(index, answer.correct);
            answerOptionsDiv.appendChild(answerBtn);
        });

        questionDiv.appendChild(answerOptionsDiv);
        quizQuestionsContainer.appendChild(questionDiv);
        answered = false;
    }

    function selectAnswer(index, isCorrect) {
        if (answered) return;
        answered = true;

        const buttons = document.querySelectorAll('.answer-btn');
        buttons.forEach((btn, i) => {
            if (i === index) {
                if (isCorrect) {
                    btn.classList.add('correct');
                    score++;
                } else {
                    btn.classList.add('incorrect');
                }
            }
            btn.disabled = true;
        });

        // Move to next question after delay
        setTimeout(() => {
            currentQuestion++;
            if (currentQuestion < quizQuestions.length) {
                displayQuestion();
            } else {
                showResults();
            }
        }, 1500);
    }

    function showResults() {
        quizQuestionsContainer.style.display = 'none';
        quizResultsContainer.style.display = 'block';

        const percentage = Math.round((score / quizQuestions.length) * 100);
        const scoreMessage = document.getElementById('score-message');

        if (percentage === 100) {
            scoreMessage.textContent = `Perfect! You scored ${score}/${quizQuestions.length}! 💧`;
        } else if (percentage >= 85) {
            scoreMessage.textContent = `Excellent! You scored ${score}/${quizQuestions.length}! Great understanding! 🌊`;
        } else if (percentage >= 70) {
            scoreMessage.textContent = `Good job! You scored ${score}/${quizQuestions.length}. Review the page to learn more! 📚`;
        } else {
            scoreMessage.textContent = `You scored ${score}/${quizQuestions.length}. Reread the lesson and try again! 💪`;
        }
    }

    const retakeBtn = document.getElementById('retake-quiz-btn');
    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            currentQuestion = 0;
            score = 0;
            quizQuestionsContainer.style.display = 'block';
            quizResultsContainer.style.display = 'none';
            displayQuestion();
        });
    }

    // Display first question
    displayQuestion();
}

// ========== ACCESSIBILITY: KEYBOARD NAVIGATION ==========

document.addEventListener('keydown', (e) => {
    // Allow Tab navigation to work normally
    if (e.key === 'Tab') {
        return;
    }

    // Allow arrow keys to navigate stage buttons
    const activeStagebtn = document.querySelector('.stage-btn.active');
    if (activeStagebtn && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const allBtns = Array.from(document.querySelectorAll('.stage-btn'));
        const currentIndex = allBtns.indexOf(activeStagebtn);
        let nextIndex;

        if (e.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % allBtns.length;
        } else {
            nextIndex = (currentIndex - 1 + allBtns.length) % allBtns.length;
        }

        allBtns[nextIndex].click();
    }
});
