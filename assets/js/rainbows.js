// ========================================
// RAINBOWS LESSON PAGE - JAVASCRIPT
// ========================================

// ========== STEP SELECTOR LOGIC ==========

document.addEventListener('DOMContentLoaded', () => {
    initStepSelector();
    initSimulation();
    initQuiz();
});

function initStepSelector() {
    const stepButtons = document.querySelectorAll('.step-btn');

    stepButtons.forEach(button => {
        button.addEventListener('click', () => {
            const stepNumber = button.getAttribute('data-step');

            // Remove active class from all buttons
            stepButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Hide all explanations
            document.querySelectorAll('.step-explanation').forEach(exp => {
                exp.style.display = 'none';
            });

            // Show selected explanation
            const selectedExplanation = document.getElementById(`step-${stepNumber}`);
            if (selectedExplanation) {
                selectedExplanation.style.display = 'block';
            }
        });
    });
}

// ========== SIMULATION LOGIC ==========

function initSimulation() {
    const canvas = document.getElementById('simulation-canvas');
    const sunHeightSlider = document.getElementById('sun-height-slider');
    const sunHeightValue = document.getElementById('sun-height-value');
    const doubleRainbowToggle = document.getElementById('double-rainbow-toggle');
    const labelsToggle = document.getElementById('labels-toggle');
    const animateBtn = document.getElementById('animate-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Initial simulation state
    let simulationState = {
        sunHeight: 45,
        showDouble: false,
        showLabels: true,
        isAnimating: false
    };

    // Update display value on slider change
    sunHeightSlider.addEventListener('input', (e) => {
        simulationState.sunHeight = parseInt(e.target.value);
        sunHeightValue.textContent = simulationState.sunHeight;
        drawSimulation();
    });

    doubleRainbowToggle.addEventListener('change', (e) => {
        simulationState.showDouble = e.target.checked;
        drawSimulation();
    });

    labelsToggle.addEventListener('change', (e) => {
        simulationState.showLabels = e.target.checked;
        drawSimulation();
    });

    animateBtn.addEventListener('click', () => {
        if (!simulationState.isAnimating) {
            animateLightPath();
        }
    });

    resetBtn.addEventListener('click', () => {
        sunHeightSlider.value = 45;
        simulationState.sunHeight = 45;
        sunHeightValue.textContent = '45';
        doubleRainbowToggle.checked = false;
        simulationState.showDouble = false;
        labelsToggle.checked = true;
        simulationState.showLabels = true;
        drawSimulation();
    });

    let simDOM = null;

    function setupSimulationDOM() {
        canvas.innerHTML = '';
        const dom = {};

        const width = 500;
        const height = 400;
        const centerX = width / 2;
        const centerY = height * 0.7;
        const observerX = 50;
        const observerY = centerY;
        const rainX = 300;

        // 1. Shared Rainbow Gradient
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'rainbowGradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '0%');
        const colors = [
            { offset: '0%', color: '#FF0000' },
            { offset: '16.67%', color: '#FF7F00' },
            { offset: '33.33%', color: '#FFFF00' },
            { offset: '50%', color: '#00FF00' },
            { offset: '66.67%', color: '#0000FF' },
            { offset: '83.33%', color: '#4B0082' },
            { offset: '100%', color: '#9400D3' }
        ];
        colors.forEach(({ offset, color }) => {
            const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop.setAttribute('offset', offset);
            stop.setAttribute('style', `stop-color:${color};stop-opacity:1`);
            gradient.appendChild(stop);
        });
        defs.appendChild(gradient);
        canvas.appendChild(defs);

        // Draw sky background
        const sky = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        sky.setAttribute('width', width);
        sky.setAttribute('height', height);
        sky.setAttribute('fill', '#E8F4F8');
        canvas.appendChild(sky);

        // Draw sun
        dom.sun = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dom.sun.setAttribute('r', '20');
        dom.sun.setAttribute('fill', '#FFD700');
        dom.sun.setAttribute('opacity', '0.9');
        canvas.appendChild(dom.sun);

        dom.sunLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dom.sunLabel.setAttribute('text-anchor', 'middle');
        dom.sunLabel.setAttribute('font-size', '11');
        dom.sunLabel.setAttribute('fill', '#333');
        dom.sunLabel.textContent = 'Sun';
        canvas.appendChild(dom.sunLabel);

        // Primary Rainbow
        dom.primaryBow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        dom.primaryBow.setAttribute('stroke', 'url(#rainbowGradient)');
        dom.primaryBow.setAttribute('stroke-width', '12');
        dom.primaryBow.setAttribute('fill', 'none');
        dom.primaryBow.setAttribute('stroke-linecap', 'round');
        canvas.appendChild(dom.primaryBow);

        // Secondary Rainbow
        dom.secondaryBow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        dom.secondaryBow.setAttribute('stroke', 'url(#rainbowGradient)');
        dom.secondaryBow.setAttribute('stroke-width', '8');
        dom.secondaryBow.setAttribute('fill', 'none');
        dom.secondaryBow.setAttribute('stroke-linecap', 'round');
        dom.secondaryBow.setAttribute('opacity', '0.5');
        canvas.appendChild(dom.secondaryBow);

        // Draw observer (stick figure)
        // Head
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        head.setAttribute('cx', observerX);
        head.setAttribute('cy', observerY - 30);
        head.setAttribute('r', '8');
        head.setAttribute('fill', '#333');
        canvas.appendChild(head);

        // Body
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        body.setAttribute('x1', observerX);
        body.setAttribute('y1', observerY - 22);
        body.setAttribute('x2', observerX);
        body.setAttribute('y2', observerY);
        body.setAttribute('stroke', '#333');
        body.setAttribute('stroke-width', '2');
        canvas.appendChild(body);

        // Arms
        const arms = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        arms.setAttribute('x1', observerX - 12);
        arms.setAttribute('y1', observerY - 15);
        arms.setAttribute('x2', observerX + 12);
        arms.setAttribute('y2', observerY - 15);
        arms.setAttribute('stroke', '#333');
        arms.setAttribute('stroke-width', '2');
        canvas.appendChild(arms);

        // Legs
        const legs = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        legs.setAttribute('x1', observerX - 8);
        legs.setAttribute('y1', observerY);
        legs.setAttribute('x2', observerX - 8);
        legs.setAttribute('y2', observerY + 15);
        legs.setAttribute('stroke', '#333');
        legs.setAttribute('stroke-width', '2');
        canvas.appendChild(legs);

        dom.observerLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dom.observerLabel.setAttribute('x', observerX);
        dom.observerLabel.setAttribute('y', observerY + 35);
        dom.observerLabel.setAttribute('text-anchor', 'middle');
        dom.observerLabel.setAttribute('font-size', '11');
        dom.observerLabel.setAttribute('fill', '#333');
        dom.observerLabel.textContent = 'Observer';
        canvas.appendChild(dom.observerLabel);

        // Draw rain zone (light gray rectangles)
        const rainZones = [
            { y: centerY - 80, height: 20 },
            { y: centerY - 50, height: 20 },
            { y: centerY - 20, height: 20 }
        ];

        rainZones.forEach(zone => {
            const rainDrop = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            rainDrop.setAttribute('cx', rainX + Math.random() * 60);
            rainDrop.setAttribute('cy', zone.y);
            rainDrop.setAttribute('r', '8');
            rainDrop.setAttribute('fill', '#B0E0E6');
            rainDrop.setAttribute('stroke', '#4A90E2');
            rainDrop.setAttribute('stroke-width', '1');
            canvas.appendChild(rainDrop);
        });

        dom.rainLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dom.rainLabel.setAttribute('x', rainX);
        dom.rainLabel.setAttribute('y', centerY + 80);
        dom.rainLabel.setAttribute('text-anchor', 'middle');
        dom.rainLabel.setAttribute('font-size', '11');
        dom.rainLabel.setAttribute('fill', '#333');
        dom.rainLabel.textContent = 'Rain';
        canvas.appendChild(dom.rainLabel);

        dom.primaryLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dom.primaryLabel.setAttribute('font-size', '10');
        dom.primaryLabel.setAttribute('fill', '#FF0000');
        dom.primaryLabel.textContent = 'Primary';
        canvas.appendChild(dom.primaryLabel);

        dom.secondaryLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dom.secondaryLabel.setAttribute('font-size', '10');
        dom.secondaryLabel.setAttribute('fill', '#666');
        dom.secondaryLabel.setAttribute('opacity', '0.7');
        dom.secondaryLabel.textContent = 'Secondary';
        canvas.appendChild(dom.secondaryLabel);

        return dom;
    }

    function getArcPath(centerX, centerY, radius, startAngle, endAngle) {
        const startX = centerX + radius * Math.cos(startAngle);
        const startY = centerY + radius * Math.sin(startAngle);
        const endX = centerX + radius * Math.cos(endAngle);
        const endY = centerY + radius * Math.sin(endAngle);
        const largeArc = endAngle - startAngle < Math.PI ? 0 : 1;
        return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
    }

    function drawSimulation() {
        if (!simDOM) {
            simDOM = setupSimulationDOM();
        }

        const width = 500;
        const height = 400;
        const centerX = width / 2;
        const centerY = height * 0.7;
        const observerX = 50;

        // Calculate rainbow angle based on sun height
        const sunDistance = 150;
        const sunAngleRad = (simulationState.sunHeight * Math.PI) / 180;
        const sunX = centerX + sunDistance * Math.cos(sunAngleRad);
        const sunY = centerY - sunDistance * Math.sin(sunAngleRad);

        // Update Sun
        simDOM.sun.setAttribute('cx', sunX);
        simDOM.sun.setAttribute('cy', sunY);
        simDOM.sunLabel.setAttribute('x', sunX);
        simDOM.sunLabel.setAttribute('y', sunY + 40);

        // Rainbow calculations
        const rainbowAngle = 42 - (simulationState.sunHeight * 0.3);
        const rainbowRadius = 100 - simulationState.sunHeight * 0.5;
        const startAngle = (180 + rainbowAngle) * (Math.PI / 180);
        const endAngle = (rainbowAngle) * (Math.PI / 180);

        // Primary
        simDOM.primaryBow.setAttribute('d', getArcPath(observerX, centerY, rainbowRadius, startAngle, endAngle));
        simDOM.primaryLabel.setAttribute('x', observerX + rainbowRadius - 30);
        simDOM.primaryLabel.setAttribute('y', centerY - rainbowRadius + 40);

        // Secondary
        const secondaryRadius = rainbowRadius + 25;
        simDOM.secondaryBow.setAttribute('d', getArcPath(observerX, centerY, secondaryRadius, startAngle, endAngle));
        simDOM.secondaryLabel.setAttribute('x', observerX + secondaryRadius - 30);
        simDOM.secondaryLabel.setAttribute('y', centerY - secondaryRadius + 60);

        // Update visibilities
        const labelDisplay = simulationState.showLabels ? 'inline' : 'none';
        simDOM.sunLabel.style.display = labelDisplay;
        simDOM.observerLabel.style.display = labelDisplay;
        simDOM.rainLabel.style.display = labelDisplay;
        simDOM.primaryLabel.style.display = labelDisplay;
        
        simDOM.secondaryLabel.style.display = (simulationState.showLabels && simulationState.showDouble) ? 'inline' : 'none';
        simDOM.secondaryBow.style.display = simulationState.showDouble ? 'inline' : 'none';
    }

    function animateLightPath() {
        simulationState.isAnimating = true;
        animateBtn.disabled = true;

        lce 
       
        const sunDistance = 150;
        const sunAngleRad = (simulationState.sunHeight * Math.PI) / 180;
        const sunX = centerX + sunDistance * Math.cos(sunAngleRad);
        const sunY = centerY - sunDistance * Math.sin(sunAngleRad);

        // Target a raindrop and b        const rainX = 330;
reateElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = `M ${sunX} ${sunY} L ${rainX} ${rainY} L ${observerX} ${observerY - 30}`;
        
        ray.setAttribute('d', pathData);
        ray.setAttribute('stroke', '#FFFFFF');
oke-linecap', 'round');
  ray.seconst pathLength = 600;
        ray.setAttribute('stroke-dasharray', pathLength);
        ray.setAttribute('stroke-dashoffset', pathLength);
        
        canvas.appendChild(ray);

        let offset = pathLength;
        function animateFrame() {
            offset -= 15;
            ray.setAttribute('stroke-dashoffset', Math.max(0, offset));
            
            if (offset > 0) {
                requestAnimationFrame(animateFrame);
            } else {
                ray.style.transition = 'opacity 0.4s ease';
                ray.style.opacity = '0';
                setTimeout(() => {
                    ray.remove();
                    simulationState.isAnimating = false;
                    animateBtn.disabled = false;
                }, 400);
            }
        }
        
        requestAnimationFrame(animateFrame);
    }

    // Initial dra
========= QUIZ L====
function initQuiz() {
    const quizQuestions = [
        {
            question: 'What must be behind you for you to see a rainbow?',
            answers: [
                { text: 'The Moon', correct: false },
             
        },
        {
            question: 'Which color of the rainbow bends the LEAST when light enters a raindrop?',
            answers: [
                { text: 'Violet', correct: false },
                { text: 'Blue', correct: false },
                { text: 'Red', correct: true },
                { text: 'Green', correct: false }
            ]
        },
        {
            question: 'What is the process called when light bends as it enters a raindrop?',
            answers: [
                { text: 'Reflection', correct: false },
                { text: 'Refraction', correct: true },
                { text: 'Dispersion', correct: false },
                { text: 'Absorption', correct: false }
            ]
        },
        {
            question: 'Why is a secondary rainbow dimmer than a primary rainbow?',
            answers: [
                { text: 'It is farther away', correct: false },
                { text: 'Light reflects more times inside the raindrop', correct: true },
                { text: 'The secondary rainbow uses less sunlight', correct: false },
                { text: 'Secondary rainbows are made of different colors', correct: false }
            ]
        },
        {
            question: 'What is the acronym that helps us remember the rainbow colors?',
            answers: [
                { text: 'ROYGBIV', correct: true },
                { text: 'ROYGBV', correct: false },
                { text: 'ROGBIV', correct: false },
                { text: 'ROYGBI', correct: false }
            ]
        },
        {
            question: 'At what angle do we see the primary rainbow from the antisolar point?',
            answers: [
                { text: 'About 30°', correct: false },
                { text: 'About 42°', correct: true },
                { text: 'About 60°', correct: false },
                { text: 'About 90°', correct: false }
            ]
        },
        {
            question: 'In a secondary rainbow, what is reversed compared to a primary rainbow?',
            answers: [
                { text: 'The brightness', correct: false },
                { text: 'The position', correct: false },
                { text: 'The color order', correct: true },
                { text: 'The size', correct: false }
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
            scoreMessage.textContent = `Perfect! You scored ${score}/${quizQuestions.length}! 🌈`;
        } else if (percentage >= 80) {
            scoreMessage.textContent = `Excellent! You scored ${score}/${quizQuestions.length}! Great understanding! 🎉`;
        } else if (percentage >= 60) {
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

// ========== SMOOTH SCROLL FOR TABLE OF CONTENTS ==========

document.querySelectorAll('.table-of-contents a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ========== ACCESSIBILITY: KEYBOARD NAVIGATION ==========

document.addEventListener('keydown', (e) => {
    // Allow Tab navigation to work normally
    if (e.key === 'Tab') {
        return;
    }

    // Allow arrow keys to navigate step buttons
    const activeStepBtn = document.querySelector('.step-btn.active');
    if (activeStepBtn && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const allBtns = Array.from(document.querySelectorAll('.step-btn'));
        const currentIndex = allBtns.indexOf(activeStepBtn);
        let nextIndex;

        if (e.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % allBtns.length;
        } else {
            nextIndex = (currentIndex - 1 + allBtns.length) % allBtns.length;
        }

        allBtns[nextIndex].click();
    }
});
