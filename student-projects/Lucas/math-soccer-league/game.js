const setupScreen = document.getElementById("setupScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");
const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
const levelText = document.getElementById("levelText");
const difficultyText = document.getElementById("difficultyText");
const aiChanceText = document.getElementById("aiChanceText");
const questionText = document.getElementById("questionText");
const feedbackText = document.getElementById("feedbackText");
const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");
const shotBall = document.getElementById("shotBall");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const playAgainButton = document.getElementById("playAgainButton");

const totalLevels = 20;

const difficulties = {
  beginner: {
    label: "Beginner",
    aiChanceLabel: "Low",
    aiScoreChance: 0.25,
    maxBase: 10,
    levelBoost: 1
  },
  intermediate: {
    label: "Intermediate",
    aiChanceLabel: "Medium",
    aiScoreChance: 0.42,
    maxBase: 14,
    levelBoost: 2
  },
  pro: {
    label: "Pro",
    aiChanceLabel: "High",
    aiScoreChance: 0.58,
    maxBase: 18,
    levelBoost: 3
  }
};

let state = {
  difficulty: null,
  level: 1,
  playerScore: 0,
  aiScore: 0,
  currentAnswer: 0,
  acceptingAnswers: false
};

document.querySelectorAll("[data-difficulty]").forEach((button) => {
  button.addEventListener("click", () => startGame(button.dataset.difficulty));
});

answerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!state.acceptingAnswers) {
    return;
  }

  const playerAnswer = Number(answerInput.value);
  const isCorrect = playerAnswer === state.currentAnswer;
  state.acceptingAnswers = false;
  answerInput.disabled = true;

  if (isCorrect) {
    state.playerScore += 1;
    feedbackText.textContent = "Goal! Correct answer.";
    feedbackText.className = "feedback good";
    animateShot("goal");
  } else {
    feedbackText.textContent = `Miss! The answer was ${state.currentAnswer}.`;
    feedbackText.className = "feedback bad";
    animateShot("miss");
  }

  if (Math.random() < difficulties[state.difficulty].aiScoreChance) {
    state.aiScore += 1;
  }

  updateScoreboard();

  window.setTimeout(() => {
    if (state.level >= totalLevels) {
      finishGame();
      return;
    }

    state.level += 1;
    showNextQuestion();
  }, 1100);
});

playAgainButton.addEventListener("click", () => {
  resultScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");
});

function startGame(difficulty) {
  state = {
    difficulty,
    level: 1,
    playerScore: 0,
    aiScore: 0,
    currentAnswer: 0,
    acceptingAnswers: true
  };

  setupScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  difficultyText.textContent = difficulties[difficulty].label;
  aiChanceText.textContent = difficulties[difficulty].aiChanceLabel;
  updateScoreboard();
  showNextQuestion();
}

function showNextQuestion() {
  const question = createQuestion();

  state.currentAnswer = question.answer;
  state.acceptingAnswers = true;
  levelText.textContent = `${state.level} / ${totalLevels}`;
  questionText.textContent = question.text;
  feedbackText.textContent = "Answer to take your shot.";
  feedbackText.className = "feedback";
  answerInput.value = "";
  answerInput.disabled = false;
  answerInput.focus();
  shotBall.className = "shot-ball";
}

function createQuestion() {
  const difficulty = difficulties[state.difficulty];
  const max = difficulty.maxBase + state.level * difficulty.levelBoost;
  const operation = ["+", "-", "x", "/"][randomInt(0, 3)];

  if (operation === "+") {
    const a = randomInt(1, max);
    const b = randomInt(1, max);
    return { text: `${a} + ${b} = ?`, answer: a + b };
  }

  if (operation === "-") {
    const a = randomInt(2, max + 10);
    const b = randomInt(1, a);
    return { text: `${a} - ${b} = ?`, answer: a - b };
  }

  if (operation === "x") {
    const a = randomInt(2, Math.max(4, Math.floor(max / 2)));
    const b = randomInt(2, Math.max(6, Math.floor(max / 2)));
    return { text: `${a} x ${b} = ?`, answer: a * b };
  }

  const divisor = randomInt(2, Math.max(5, Math.floor(max / 3)));
  const answer = randomInt(2, Math.max(6, Math.floor(max / 2)));
  const dividend = divisor * answer;
  return { text: `${dividend} / ${divisor} = ?`, answer };
}

function updateScoreboard() {
  playerScoreEl.textContent = state.playerScore;
  aiScoreEl.textContent = state.aiScore;
}

function animateShot(result) {
  shotBall.className = `shot-ball ${result}`;
}

function finishGame() {
  gameScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");

  if (state.playerScore > state.aiScore) {
    resultTitle.textContent = "You won the match!";
    resultMessage.textContent = `Final score: You ${state.playerScore}, AI ${state.aiScore}. Math champion status unlocked.`;
  } else if (state.playerScore < state.aiScore) {
    resultTitle.textContent = "The AI won this one";
    resultMessage.textContent = `Final score: You ${state.playerScore}, AI ${state.aiScore}. Train again and take the rematch.`;
  } else {
    resultTitle.textContent = "It is a draw!";
    resultMessage.textContent = `Final score: You ${state.playerScore}, AI ${state.aiScore}. That was a tight match.`;
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
