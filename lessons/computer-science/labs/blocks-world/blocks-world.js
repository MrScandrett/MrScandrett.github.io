(function () {
  const form = document.getElementById("bw-form");
  const commandInput = document.getElementById("bw-command");
  const outputEl = document.getElementById("bw-output");
  const logEl = document.getElementById("bw-log");
  const worldEl = document.getElementById("bw-world");
  const stateTextEl = document.getElementById("bw-state-text");
  const resetBtn = document.getElementById("bw-reset");
  const examplesWrap = document.querySelector(".bw-examples");
  const traceInputEl = document.getElementById("bw-trace-input");
  const traceIntentEl = document.getElementById("bw-trace-intent");
  const traceObjectsEl = document.getElementById("bw-trace-objects");
  const traceDecisionEl = document.getElementById("bw-trace-decision");
  const traceStatusEl = document.getElementById("bw-trace-status");
  const guidedRunBtn = document.getElementById("bw-guided-run");
  const missionFeedbackEl = document.getElementById("bw-mission-feedback");
  const progressEl = document.getElementById("bw-progress");
  const coachStepEl = document.getElementById("bw-coach-step");
  const coachTitleEl = document.getElementById("bw-coach-title");
  const coachWhyEl = document.getElementById("bw-coach-why");
  const commandPreviewEl = document.getElementById("bw-command-preview");

  const required = [
    form, commandInput, outputEl, logEl, worldEl, stateTextEl, resetBtn, examplesWrap,
    traceInputEl, traceIntentEl, traceObjectsEl, traceDecisionEl, traceStatusEl,
    guidedRunBtn, missionFeedbackEl, progressEl, coachStepEl, coachTitleEl,
    coachWhyEl, commandPreviewEl
  ];
  if (required.some((node) => !node)) {
    throw new Error("Blocks World lab failed to initialize. Missing required DOM nodes.");
  }

  const BLOCKS = ["A", "B", "C", "D"];
  const INITIAL_ON = new Map([
    ["A", "B"],
    ["B", "table"],
    ["C", "table"],
    ["D", "C"]
  ]);

  const state = {
    blocks: BLOCKS.slice(),
    on: new Map(),
    clear: new Set(),
    holding: null,
    handempty: true,
    stepCount: 0
  };

  function cloneInitialOn() {
    return new Map(INITIAL_ON);
  }

  function normalizeCommand(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function topOf(target) {
    for (const block of state.blocks) {
      if (state.on.get(block) === target) return block;
    }
    return null;
  }

  function existsBlock(block) {
    return state.blocks.includes(block);
  }

  function deriveState() {
    const clearSet = new Set(state.blocks);
    for (const [, support] of state.on) {
      if (support && support !== "table") {
        clearSet.delete(support);
      }
    }
    state.clear = clearSet;
    state.handempty = state.holding === null;
  }

  function resetWorld() {
    state.on = cloneInitialOn();
    state.holding = null;
    state.handempty = true;
    state.stepCount = 0;
    deriveState();
    renderWorld();
    renderStateText();
    logEl.innerHTML = "";
    resetTrace();
    updateMission();
    setOutput("Ready! Start with Step 1 below.", "success");
  }

  function predicateLines() {
    const lines = [];
    for (const block of state.blocks) {
      const support = state.on.get(block);
      if (support) {
        lines.push(`on(${block},${support})`);
      }
    }

    for (const block of state.blocks) {
      if (state.clear.has(block)) {
        lines.push(`clear(${block})`);
      }
    }

    if (state.holding) {
      lines.push(`holding(${state.holding})`);
    }

    lines.push(state.handempty ? "handempty" : "hand not empty");
    return lines;
  }

  function renderStateText() {
    stateTextEl.textContent = predicateLines().join("\n");
  }

  function buildStacks() {
    const bottoms = state.blocks.filter((block) => state.on.get(block) === "table");
    const stacks = [];

    for (const bottom of bottoms) {
      const stack = [bottom];
      let current = bottom;
      while (true) {
        const next = topOf(current);
        if (!next) break;
        stack.push(next);
        current = next;
      }
      stacks.push(stack);
    }

    return stacks;
  }

  function renderWorld() {
    const stacks = buildStacks();
    worldEl.innerHTML = "";

    const hand = document.createElement("p");
    hand.className = "bw-hand";
    hand.textContent = state.holding ? `Hand: holding ${state.holding}` : "Hand: empty";

    const stacksWrap = document.createElement("div");
    stacksWrap.className = "bw-stacks";

    for (const stack of stacks) {
      const col = document.createElement("div");
      col.className = "bw-stack";

      for (const block of stack) {
        const blockEl = document.createElement("div");
        blockEl.className = "bw-block";
        blockEl.textContent = block;
        blockEl.dataset.block = block;
        if (state.clear.has(block)) {
          blockEl.classList.add("is-clear");
        }
        col.appendChild(blockEl);
      }

      stacksWrap.appendChild(col);
    }

    if (state.holding) {
      const holdStack = document.createElement("div");
      holdStack.className = "bw-stack";
      const holdBlock = document.createElement("div");
      holdBlock.className = "bw-block is-clear";
      holdBlock.textContent = state.holding;
      holdBlock.dataset.block = state.holding;
      holdStack.appendChild(holdBlock);
      stacksWrap.appendChild(holdStack);
    }

    const table = document.createElement("div");
    table.className = "bw-table";

    worldEl.append(hand, stacksWrap, table);
    const stackDescription = stacks.map((stack) => stack.join(" on ")).join("; ");
    worldEl.setAttribute(
      "aria-label",
      `Blocks world. ${stackDescription || "No blocks on the table"}. ${hand.textContent}.`
    );
  }

  function resetTrace() {
    traceInputEl.textContent = "—";
    traceIntentEl.textContent = "—";
    traceObjectsEl.textContent = "—";
    traceDecisionEl.textContent = "Run a command";
    traceStatusEl.textContent = "Waiting";
    traceStatusEl.className = "bw-trace-status is-idle";
  }

  function updateTrace(rawInput, parsed, result) {
    const friendlyIntents = {
      move_onto: "move a block on top of another",
      move_table: "move a block to the table",
      unstack_from: "take one block off another",
      clear: "remove blocks from the top",
      show_state: "show the robot's memory"
    };
    traceInputEl.textContent = rawInput || "—";
    traceIntentEl.textContent = parsed.error ? "I don't know that command" : friendlyIntents[parsed.intent];
    traceObjectsEl.textContent = parsed.error
      ? "—"
      : [parsed.x, parsed.y].filter(Boolean).join(", ") || "none";
    traceDecisionEl.textContent = parsed.error
      ? "The robot needs a command it knows"
      : result.ok
        ? "The way is clear, so the block moved"
        : "Something is in the way, so nothing moved";
    traceStatusEl.textContent = parsed.error || !result.ok ? "Not moved" : "Moved";
    traceStatusEl.className = `bw-trace-status ${parsed.error || !result.ok ? "is-error" : "is-success"}`;
  }

  function updateMission() {
    const completed = [
      state.on.get("A") === "table",
      state.on.get("D") === "B",
      state.on.get("C") === "A"
    ];
    const missionSteps = [
      {
        command: "move A to table",
        title: "First, move A out of the way",
        why: "A must move so B has an open top.",
        words: ["Move", "A", "to the table"]
      },
      {
        command: "move D onto B",
        title: "Now build the first tower",
        why: "B is open, so D can sit on top of it.",
        words: ["Move", "D", "on top of B"]
      },
      {
        command: "move C onto A",
        title: "Finish the second tower",
        why: "C and A are both open and ready.",
        words: ["Move", "C", "on top of A"]
      }
    ];
    const completedCount = completed.findIndex((done) => !done);
    const nextIndex = completedCount === -1 ? missionSteps.length : completedCount;
    const dots = Array.from(progressEl.children);

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-complete", index < nextIndex);
      dot.classList.toggle("is-current", index === nextIndex);
      dot.textContent = index < nextIndex ? "✓" : String(index + 1);
    });

    if (nextIndex === missionSteps.length) {
      coachStepEl.textContent = "Mission complete";
      coachTitleEl.textContent = "Both towers match!";
      coachWhyEl.textContent = "You gave the robot three commands in the right order.";
      commandPreviewEl.innerHTML = "<strong>Great job!</strong>";
      commandPreviewEl.setAttribute("aria-label", "Mission complete");
      guidedRunBtn.disabled = true;
      guidedRunBtn.innerHTML = "<span aria-hidden='true'>✓</span> Finished";
      missionFeedbackEl.classList.add("is-complete");
      missionFeedbackEl.textContent = "You did it!";
      progressEl.setAttribute("aria-label", "Mission progress: complete");
      return;
    }

    const next = missionSteps[nextIndex];
    coachStepEl.textContent = `Step ${nextIndex + 1} of ${missionSteps.length}`;
    coachTitleEl.textContent = next.title;
    coachWhyEl.textContent = next.why;
    commandPreviewEl.innerHTML = "";
    next.words.forEach((word, index) => {
      const part = document.createElement(index === 1 ? "strong" : "span");
      part.textContent = word;
      commandPreviewEl.appendChild(part);
    });
    commandPreviewEl.setAttribute("aria-label", `Command: ${next.words.join(" ")}`);
    guidedRunBtn.dataset.command = next.command;
    guidedRunBtn.disabled = false;
    guidedRunBtn.innerHTML = "<span aria-hidden='true'>▶</span> Run this move";
    missionFeedbackEl.classList.remove("is-complete");
    missionFeedbackEl.textContent = nextIndex === 0 ? "Press the green button." : "Nice! The next move is ready.";
    progressEl.setAttribute("aria-label", `Mission progress: step ${nextIndex + 1} of ${missionSteps.length}`);
  }

  function setOutput(message, kind) {
    outputEl.className = "bw-output";
    if (kind === "error") {
      outputEl.classList.add("is-error");
    } else if (kind === "success") {
      outputEl.classList.add("is-success");
    }
    outputEl.textContent = message;
  }

  function appendLog(command, steps, kind) {
    state.stepCount += 1;
    const item = document.createElement("li");
    item.className = "bw-log-item";

    const title = document.createElement("strong");
    title.textContent = `${state.stepCount}. ${command}`;

    const status = document.createElement("span");
    status.textContent = kind === "error" ? " (error)" : " (ok)";
    title.appendChild(status);

    const list = document.createElement("ul");
    list.className = "bw-log-steps";
    for (const step of steps) {
      const line = document.createElement("li");
      line.textContent = step;
      list.appendChild(line);
    }

    item.append(title, list);
    logEl.prepend(item);
  }

  function parseCommand(raw) {
    const text = normalizeCommand(raw);
    if (!text) return { error: "Type a command first. Example: move A onto B" };

    let match = text.match(/^move\s+([a-z])\s+onto\s+([a-z])$/i);
    if (match) {
      return { intent: "move_onto", x: match[1].toUpperCase(), y: match[2].toUpperCase(), raw: text };
    }

    match = text.match(/^move\s+([a-z])\s+to\s+table$/i);
    if (match) {
      return { intent: "move_table", x: match[1].toUpperCase(), raw: text };
    }

    match = text.match(/^stack\s+([a-z])\s+on\s+([a-z])$/i);
    if (match) {
      return { intent: "move_onto", x: match[1].toUpperCase(), y: match[2].toUpperCase(), raw: text };
    }

    match = text.match(/^unstack\s+([a-z])\s+from\s+([a-z])$/i);
    if (match) {
      return { intent: "unstack_from", x: match[1].toUpperCase(), y: match[2].toUpperCase(), raw: text };
    }

    match = text.match(/^clear\s+([a-z])$/i);
    if (match) {
      return { intent: "clear", x: match[1].toUpperCase(), raw: text };
    }

    if (text === "show state") {
      return { intent: "show_state", raw: text };
    }

    return {
      error:
        "Command not recognized. Try: move A onto B, move A to table, stack A on B, unstack A from B, clear B, show state"
    };
  }

  function fail(steps, message) {
    steps.push(`Precondition failed: ${message}`);
    return { ok: false, message };
  }

  function pickup(block, steps) {
    steps.push(`Action: pickup(${block})`);
    if (!state.handempty) {
      return fail(steps, `hand is not empty (holding ${state.holding}).`);
    }
    if (state.on.get(block) !== "table") {
      return fail(steps, `${block} is not on the table.`);
    }
    if (!state.clear.has(block)) {
      const top = topOf(block);
      return fail(steps, `${block} isn't clear (${top} is on top of it).`);
    }

    state.on.set(block, null);
    state.holding = block;
    deriveState();
    steps.push(`State change: holding(${block}), removed on(${block},table).`);
    return { ok: true };
  }

  function unstack(block, support, steps) {
    steps.push(`Action: unstack(${block},${support})`);
    if (!state.handempty) {
      return fail(steps, `hand is not empty (holding ${state.holding}).`);
    }
    if (state.on.get(block) !== support) {
      return fail(steps, `${block} is not on ${support}.`);
    }
    if (!state.clear.has(block)) {
      const top = topOf(block);
      return fail(steps, `${block} isn't clear (${top} is on top of it).`);
    }

    state.on.set(block, null);
    state.holding = block;
    deriveState();
    steps.push(`State change: holding(${block}), cleared top of ${support}.`);
    return { ok: true };
  }

  function putdown(block, steps) {
    steps.push(`Action: putdown(${block})`);
    if (state.holding !== block) {
      return fail(steps, `hand is not holding ${block}.`);
    }

    state.on.set(block, "table");
    state.holding = null;
    deriveState();
    steps.push(`State change: on(${block},table), handempty.`);
    return { ok: true };
  }

  function stack(block, support, steps) {
    steps.push(`Action: stack(${block},${support})`);
    if (block === support) {
      return fail(steps, `You can't move ${block} onto itself.`);
    }
    if (state.holding !== block) {
      return fail(steps, `hand is not holding ${block}.`);
    }
    if (!state.clear.has(support)) {
      const top = topOf(support);
      return fail(
        steps,
        `${support} isn't clear (${top} is on top of it). Try "move ${top} to table" first.`
      );
    }

    state.on.set(block, support);
    state.holding = null;
    deriveState();
    steps.push(`State change: on(${block},${support}), handempty.`);
    return { ok: true };
  }

  function ensureBlock(block, steps) {
    if (!existsBlock(block)) {
      return fail(steps, `Unknown block ${block}. Valid blocks are ${state.blocks.join(", ")}.`);
    }
    return { ok: true };
  }

  function clearBlock(block, steps) {
    while (true) {
      const top = topOf(block);
      if (!top) break;

      const sub = clearBlock(top, steps);
      if (!sub.ok) return sub;

      const support = state.on.get(top);
      if (support && support !== "table") {
        const u = unstack(top, support, steps);
        if (!u.ok) return u;
        const p = putdown(top, steps);
        if (!p.ok) return p;
      }
    }

    return { ok: true };
  }

  function execute(parsed) {
    const steps = [`Parsed intent: ${parsed.intent}`];

    if (parsed.intent === "show_state") {
      const lines = predicateLines();
      steps.push("Preconditions: none");
      steps.push(`State snapshot: ${lines.join(" | ")}`);
      return { ok: true, steps, message: lines.join(" · ") };
    }

    if (parsed.x) {
      const valid = ensureBlock(parsed.x, steps);
      if (!valid.ok) return { ok: false, steps, message: valid.message };
    }

    if (parsed.y) {
      const valid = ensureBlock(parsed.y, steps);
      if (!valid.ok) return { ok: false, steps, message: valid.message };
    }

    if (parsed.x && parsed.y && parsed.x === parsed.y) {
      const res = fail(steps, `You can't move ${parsed.x} onto ${parsed.y}.`);
      return { ok: false, steps, message: res.message };
    }

    if (parsed.intent === "move_onto") {
      const x = parsed.x;
      const y = parsed.y;

      steps.push(`Precondition check: ${x} and ${y} are valid distinct blocks (pass).`);

      if (!state.clear.has(x)) {
        const top = topOf(x);
        const res = fail(steps, `${x} isn't clear (${top} is on top of it). Try "move ${top} to table" first.`);
        return { ok: false, steps, message: res.message };
      }
      steps.push(`Precondition check: clear(${x}) (pass).`);

      if (state.holding && state.holding !== x) {
        const res = fail(steps, `Hand is already holding ${state.holding}. Try "move ${state.holding} to table" first.`);
        return { ok: false, steps, message: res.message };
      }
      steps.push("Precondition check: hand can pick/place for this command (pass).");

      if (!state.clear.has(y)) {
        const top = topOf(y);
        const res = fail(steps, `${y} isn't clear (${top} is on top of it). Try "move ${top} to table" first.`);
        return { ok: false, steps, message: res.message };
      }
      steps.push(`Precondition check: clear(${y}) (pass).`);

      if (state.holding === x) {
        const s = stack(x, y, steps);
        if (!s.ok) return { ok: false, steps, message: s.message };
      } else {
        const support = state.on.get(x);
        if (!support) {
          const res = fail(steps, `${x} is not in a movable position.`);
          return { ok: false, steps, message: res.message };
        }

        if (support === "table") {
          const p = pickup(x, steps);
          if (!p.ok) return { ok: false, steps, message: p.message };
        } else {
          const u = unstack(x, support, steps);
          if (!u.ok) return { ok: false, steps, message: u.message };
        }

        const s = stack(x, y, steps);
        if (!s.ok) return { ok: false, steps, message: s.message };
      }

      return { ok: true, steps, message: `Done: moved ${x} onto ${y}.` };
    }

    if (parsed.intent === "move_table") {
      const x = parsed.x;
      steps.push(`Precondition check: ${x} is a valid block (pass).`);

      if (state.holding && state.holding !== x) {
        const res = fail(steps, `Hand is already holding ${state.holding}. Try "move ${state.holding} to table" first.`);
        return { ok: false, steps, message: res.message };
      }

      if (state.holding === x) {
        const p = putdown(x, steps);
        if (!p.ok) return { ok: false, steps, message: p.message };
        return { ok: true, steps, message: `Done: moved ${x} to table.` };
      }

      if (!state.clear.has(x)) {
        const top = topOf(x);
        const res = fail(steps, `${x} isn't clear (${top} is on top of it). Try "move ${top} to table" first.`);
        return { ok: false, steps, message: res.message };
      }

      const support = state.on.get(x);
      if (support === "table") {
        steps.push(`Precondition check: on(${x},table) already true.`);
        return { ok: true, steps, message: `${x} is already on the table.` };
      }
      steps.push(`Precondition check: on(${x},${support}) and clear(${x}) (pass).`);

      const u = unstack(x, support, steps);
      if (!u.ok) return { ok: false, steps, message: u.message };
      const p = putdown(x, steps);
      if (!p.ok) return { ok: false, steps, message: p.message };
      return { ok: true, steps, message: `Done: moved ${x} to table.` };
    }

    if (parsed.intent === "unstack_from") {
      const x = parsed.x;
      const y = parsed.y;
      steps.push(`Precondition check: requested relation on(${x},${y}).`);

      if (state.on.get(x) !== y) {
        const res = fail(steps, `${x} is not on ${y}.`);
        return { ok: false, steps, message: res.message };
      }

      const u = unstack(x, y, steps);
      if (!u.ok) return { ok: false, steps, message: u.message };
      const p = putdown(x, steps);
      if (!p.ok) return { ok: false, steps, message: p.message };
      return { ok: true, steps, message: `Done: unstacked ${x} from ${y} and moved it to table.` };
    }

    if (parsed.intent === "clear") {
      const x = parsed.x;
      steps.push(`Goal: make clear(${x}) true by moving only blocks above ${x} to table.`);

      if (!state.handempty) {
        const res = fail(steps, `Hand is holding ${state.holding}. Try "move ${state.holding} to table" first.`);
        return { ok: false, steps, message: res.message };
      }

      if (state.clear.has(x)) {
        steps.push(`Precondition check: clear(${x}) already true.`);
        return { ok: true, steps, message: `${x} is already clear.` };
      }

      const result = clearBlock(x, steps);
      if (!result.ok) return { ok: false, steps, message: result.message };
      steps.push(`Result: clear(${x}) is now true.`);
      return { ok: true, steps, message: `Done: cleared ${x}.` };
    }

    return {
      ok: false,
      steps: steps.concat("Parser could not map this command to a supported action."),
      message: "Unsupported command. Open Help to see supported grammar."
    };
  }

  function runCommand(rawInput) {
    const parsed = parseCommand(rawInput);

    if (parsed.error) {
      const steps = ["Parser failed to match a supported grammar.", parsed.error];
      appendLog(rawInput, steps, "error");
      setOutput(parsed.error, "error");
      updateTrace(rawInput, parsed, { ok: false });
      return;
    }

    const result = execute(parsed);
    deriveState();
    renderWorld();
    renderStateText();
    if (result.ok && parsed.x) {
      const movedBlock = worldEl.querySelector(`[data-block="${parsed.x}"]`);
      if (movedBlock && typeof movedBlock.animate === "function") {
        movedBlock.animate(
          [
            { transform: "translateY(-12px) scale(1.06)", offset: 0 },
            { transform: "translateY(2px) scale(1)", offset: 0.75 },
            { transform: "translateY(0) scale(1)", offset: 1 }
          ],
          { duration: 480, easing: "ease-out" }
        );
      }
    }
    updateMission();
    updateTrace(rawInput, parsed, result);

    appendLog(parsed.raw, result.steps, result.ok ? "success" : "error");
    setOutput(result.message, result.ok ? "success" : "error");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const command = commandInput.value.trim();
    if (!command) return;
    runCommand(command);
    commandInput.focus();
  });

  resetBtn.addEventListener("click", () => {
    resetWorld();
    commandInput.value = "";
    commandInput.focus();
  });

  examplesWrap.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-example]");
    if (!btn) return;
    const cmd = btn.getAttribute("data-example") || "";
    commandInput.value = cmd;
    commandInput.focus();
  });

  guidedRunBtn.addEventListener("click", () => {
    if (guidedRunBtn.disabled) return;
    const command = guidedRunBtn.dataset.command || "";
    commandInput.value = command;
    runCommand(command);
    commandInput.focus();
  });

  document.querySelectorAll(".bw-check").forEach((card) => {
    const checkButton = card.querySelector(".bw-check-answer");
    const feedback = card.querySelector(".bw-check-feedback");
    checkButton.addEventListener("click", () => {
      const selected = card.querySelector("input[type='radio']:checked");
      if (!selected) {
        feedback.textContent = "Choose an answer first.";
        feedback.className = "bw-check-feedback is-error";
        return;
      }

      const correct = selected.value === card.dataset.answer;
      const explanations = {
        "bw-q1": "A clear block has nothing sitting on top of it, so it is ready to move.",
        "bw-q2": "The robot checks for a block in the way before it tries to move anything.",
        "bw-q3": "The robot follows a small list of commands. It cannot guess what a new command means."
      };
      feedback.textContent = `${correct ? "Correct. " : "Not yet. "}${explanations[selected.name]}`;
      feedback.className = `bw-check-feedback ${correct ? "is-correct" : "is-error"}`;
    });
  });

  resetWorld();
})();
