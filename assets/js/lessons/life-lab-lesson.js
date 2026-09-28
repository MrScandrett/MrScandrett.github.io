// Life Lab teaching widgets: rule explorer, predict-the-next-generation drill,
// quick-check quiz, and the studio shortcut bar. The simulator itself lives in
// life-lab.js; this file only talks to it through its existing buttons.
(function () {
  "use strict";

  // Conway's rule on a bounded board (cells off the edge count as dead).
  function nextGen(board) {
    const rows = board.length;
    const cols = board[0].length;
    return board.map((row, r) =>
      row.map((alive, c) => {
        let n = 0;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (!dr && !dc) continue;
            const rr = r + dr;
            const cc = c + dc;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) n += board[rr][cc];
          }
        }
        return (alive ? n === 2 || n === 3 : n === 3) ? 1 : 0;
      })
    );
  }

  function parseBoard(lines) {
    return lines.map((line) => Array.from(line, (ch) => (ch === "O" ? 1 : 0)));
  }

  // ── Studio shortcut bar ─────────────────────────────────────────────
  const studioTargets = { start: "startPauseBtn", step: "stepBtn", random: "randomBtn", clear: "clearBtn" };
  document.querySelectorAll("[data-studio]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById(studioTargets[btn.dataset.studio])?.click();
    });
  });

  // ── Rule explorer ───────────────────────────────────────────────────
  const explorer = document.getElementById("ruleExplorer");
  if (explorer) {
    const hood = explorer.querySelector(".lx-hood");
    const out = (key) => explorer.querySelector(`[data-out="${key}"]`);
    const state = [0, 1, 0, 0, 1, 1, 0, 0, 0]; // index 4 is the center
    const cells = state.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = i === 4 ? "lx-hood-cell lx-center" : "lx-hood-cell";
      b.addEventListener("click", () => {
        state[i] = state[i] ? 0 : 1;
        render();
      });
      hood.appendChild(b);
      return b;
    });

    function render() {
      const n = state.reduce((sum, v, i) => (i === 4 ? sum : sum + v), 0);
      const alive = state[4] === 1;
      cells.forEach((b, i) => {
        b.classList.toggle("is-on", state[i] === 1);
        const label = i === 4 ? `Center cell, ${state[i] ? "alive" : "dead"}` : `Neighbor, ${state[i] ? "alive" : "dead"}`;
        b.setAttribute("aria-label", label);
        b.setAttribute("aria-pressed", state[i] ? "true" : "false");
      });
      out("count").textContent = String(n);
      const verdict = out("verdict");
      const why = out("why");
      let text; let reason; let tone;
      if (alive) {
        if (n < 2) { text = "Dies"; reason = `Loneliness: a live cell needs at least 2 neighbors, and it has ${n}.`; tone = "die"; }
        else if (n > 3) { text = "Dies"; reason = `Crowding: a live cell with more than 3 neighbors dies, and it has ${n}.`; tone = "die"; }
        else { text = "Survives"; reason = `Survival: ${n} is in S23, so the cell stays alive.`; tone = "live"; }
      } else if (n === 3) {
        text = "Is born"; reason = "Birth: a dead cell with exactly 3 neighbors comes alive (B3)."; tone = "born";
      } else {
        text = "Stays dead"; reason = `Birth needs exactly 3 neighbors, and this cell has ${n}.`; tone = "none";
      }
      verdict.textContent = `${alive ? "Live" : "Dead"} center → ${text}`;
      verdict.dataset.tone = tone;
      why.textContent = reason;
    }
    render();
  }

  // ── Predict the next generation ─────────────────────────────────────
  const PUZZLES = [
    { name: "Blinker", note: "Three in a row.", board: [".....", ".....", ".OOO.", ".....", "....."] },
    { name: "Lonely pair", note: "Two cells side by side.", board: [".....", ".....", ".OO..", ".....", "....."] },
    { name: "Block", note: "A 2 × 2 square.", board: [".....", ".OO..", ".OO..", ".....", "....."] },
    { name: "L-corner", note: "Three cells in an L.", board: [".....", ".O...", ".OO..", ".....", "....."] },
    { name: "Diagonal", note: "Three cells on a diagonal.", board: [".....", ".O...", "..O..", "...O.", "....."] },
    { name: "Plus sign", note: "Five cells in a plus.", board: [".....", "..O..", ".OOO.", "..O..", "....."] },
    { name: "Glider", note: "The famous five-cell spaceship.", board: ["......", "..O...", "...O..", ".OOO..", "......", "......"] },
    { name: "Toad", note: "Two offset rows of three.", board: ["......", "......", "..OOO.", ".OOO..", "......", "......"] },
    { name: "Beehive", note: "A six-cell hexagon.", board: ["......", "..OO..", ".O..O.", "..OO..", "......"] }
  ];

  const drill = document.getElementById("predictDrill");
  if (drill) {
    const pick = document.getElementById("predictPick");
    const nowBoard = drill.querySelector('[data-board="now"]');
    const guessBoard = drill.querySelector('[data-board="guess"]');
    const result = drill.querySelector('[data-out="result"]');
    const note = drill.querySelector('[data-out="puzzleNote"]');
    const solved = new Set();
    let current = null;
    let guess = null;
    let guessCells = [];

    PUZZLES.forEach((p, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${i + 1}. ${p.name}`;
      pick.appendChild(opt);
    });

    function drawNow() {
      nowBoard.innerHTML = "";
      nowBoard.style.setProperty("--cols", current[0].length);
      current.forEach((row) => row.forEach((v) => {
        const d = document.createElement("span");
        d.className = v ? "lx-bcell is-on" : "lx-bcell";
        nowBoard.appendChild(d);
      }));
    }

    function drawGuess() {
      guessBoard.innerHTML = "";
      guessBoard.style.setProperty("--cols", guess[0].length);
      guessCells = [];
      guess.forEach((row, r) => row.forEach((v, c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = v ? "lx-bcell is-on" : "lx-bcell";
        b.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
        b.setAttribute("aria-pressed", v ? "true" : "false");
        b.addEventListener("click", () => {
          guess[r][c] = guess[r][c] ? 0 : 1;
          b.classList.toggle("is-on", guess[r][c] === 1);
          b.setAttribute("aria-pressed", guess[r][c] ? "true" : "false");
          guessCells.forEach((x) => x.classList.remove("is-ok", "is-miss", "is-extra"));
          result.textContent = "";
        });
        guessBoard.appendChild(b);
        guessCells.push(b);
      }));
    }

    function load(i) {
      pick.value = String(i);
      current = parseBoard(PUZZLES[i].board);
      guess = current.map((row) => row.map(() => 0));
      note.textContent = PUZZLES[i].note;
      result.textContent = "";
      result.dataset.tone = "";
      drawNow();
      drawGuess();
    }

    function check() {
      const answer = nextGen(current);
      let miss = 0; let extra = 0;
      answer.forEach((row, r) => row.forEach((v, c) => {
        const cell = guessCells[r * row.length + c];
        const g = guess[r][c];
        cell.classList.remove("is-ok", "is-miss", "is-extra");
        if (v && g) cell.classList.add("is-ok");
        else if (v && !g) { cell.classList.add("is-miss"); miss += 1; }
        else if (!v && g) { cell.classList.add("is-extra"); extra += 1; }
      }));
      if (!miss && !extra) {
        solved.add(pick.value);
        const total = answer.flat().reduce((a, b) => a + b, 0);
        result.textContent = total === 0
          ? `Correct! Every cell dies. Solved ${solved.size} of ${PUZZLES.length}.`
          : `Correct! Solved ${solved.size} of ${PUZZLES.length}.`;
        result.dataset.tone = "ok";
      } else {
        const parts = [];
        if (miss) parts.push(`${miss} missed birth${miss > 1 ? "s" : ""} or survivor${miss > 1 ? "s" : ""}`);
        if (extra) parts.push(`${extra} cell${extra > 1 ? "s" : ""} that should be dead`);
        result.textContent = `Not yet: ${parts.join(" and ")}. Count neighbors on the gen 0 board for the highlighted squares.`;
        result.dataset.tone = "bad";
      }
    }

    pick.addEventListener("change", () => load(Number(pick.value)));
    drill.querySelector('[data-act="check"]').addEventListener("click", check);
    drill.querySelector('[data-act="copy"]').addEventListener("click", () => {
      guess = current.map((row) => row.slice());
      drawGuess();
      result.textContent = "";
    });
    drill.querySelector('[data-act="reset"]').addEventListener("click", () => {
      guess = current.map((row) => row.map(() => 0));
      drawGuess();
      result.textContent = "";
    });
    drill.querySelector('[data-act="next"]').addEventListener("click", () => {
      load((Number(pick.value) + 1) % PUZZLES.length);
    });
    load(0);
  }

  // ── Quick check ─────────────────────────────────────────────────────
  const QUIZ = [
    {
      q: "A live cell has exactly 4 live neighbors. What happens next generation?",
      options: ["It survives", "It dies of crowding", "It gives birth to a neighbor", "Nothing, it stays the same"],
      answer: 1,
      why: "Under S23, a live cell only survives with 2 or 3 neighbors. With 4 it dies of crowding."
    },
    {
      q: "What does the rule code B36/S23 mean?",
      options: ["Born on 3 or 6, survive on 2 or 3", "Born on 36 neighbors", "Survive on 3 or 6, born on 2 or 3", "Run for 36 generations"],
      answer: 0,
      why: "B lists the neighbor counts that cause birth, and S lists the counts that allow survival. This is HighLife."
    },
    {
      q: "Why must every cell update at the same time?",
      options: [
        "It makes the computer faster",
        "Otherwise cells updated early would change the neighbor counts for cells updated later",
        "Conway liked symmetry",
        "It doesn't matter; any order works"
      ],
      answer: 1,
      why: "Every cell reads the old grid. If you updated cells one at a time in place, the result would depend on the order and patterns like the glider would break."
    },
    {
      q: "A pattern returns to its exact starting shape, in the same place, every 3 generations. What is it?",
      options: ["A still life", "A spaceship", "An oscillator with period 3", "A methuselah"],
      answer: 2,
      why: "Oscillators repeat in place. The pulsar is a period-3 oscillator. A spaceship would come back in a different place."
    },
    {
      q: "Why did the Gosper glider gun win Conway's $50 prize?",
      options: [
        "It was the largest pattern ever drawn",
        "It proved a pattern's population can grow forever",
        "It was the first oscillator",
        "It never changes"
      ],
      answer: 1,
      why: "Conway guessed no pattern could grow without limit. The gun shoots a new glider every 30 generations, so the population keeps growing."
    },
    {
      q: "What does it mean that Life is Turing complete?",
      options: [
        "It can pass the Turing test",
        "Every pattern eventually stops",
        "With enough space, Life can run any computation a computer can",
        "It was invented by Alan Turing"
      ],
      answer: 2,
      why: "Gliders act as signals and their collisions act as logic gates, so you can build any computer out of Life patterns."
    }
  ];

  const quiz = document.getElementById("lifeQuiz");
  const scoreEl = document.querySelector(".lx-quiz-score");
  if (quiz) {
    const answered = new Map();
    QUIZ.forEach((item, qi) => {
      const box = document.createElement("fieldset");
      box.className = "lx-q";
      const legend = document.createElement("legend");
      legend.textContent = `${qi + 1}. ${item.q}`;
      box.appendChild(legend);
      const fb = document.createElement("p");
      fb.className = "lx-q-why";
      fb.setAttribute("aria-live", "polite");
      item.options.forEach((opt, oi) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "lx-q-opt";
        b.textContent = opt;
        b.addEventListener("click", () => {
          if (answered.has(qi)) return;
          const right = oi === item.answer;
          answered.set(qi, right);
          box.querySelectorAll(".lx-q-opt").forEach((x, xi) => {
            x.disabled = true;
            if (xi === item.answer) x.classList.add("is-right");
          });
          if (!right) b.classList.add("is-wrong");
          fb.textContent = `${right ? "Correct." : "Not quite."} ${item.why}`;
          const score = Array.from(answered.values()).filter(Boolean).length;
          scoreEl.textContent = `Score: ${score} / ${QUIZ.length}${answered.size === QUIZ.length ? " — done!" : ""}`;
        });
        box.appendChild(b);
      });
      box.appendChild(fb);
      quiz.appendChild(box);
    });
  }
})();
