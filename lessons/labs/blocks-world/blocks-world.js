(function () {
  const form = document.getElementById("bw-form");
  const commandInput = document.getElementById("bw-command");
  const outputEl = document.getElementById("bw-output");
  const logEl = document.getElementById("bw-log");
  const worldEl = document.getElementById("bw-world");
  const stateTextEl = document.getElementById("bw-state-text");
  const resetBtn = document.getElementById("bw-reset");
  const examplesWrap = document.querySelector(".bw-examples");

  const required = [form, commandInput, outputEl, logEl, worldEl, stateTextEl, resetBtn, examplesWrap];
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
    setOutput("World reset. Try: move A onto B", "success");
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
      holdStack.appendChild(holdBlock);
      stacksWrap.appendChild(holdStack);
    }

    const table = document.createElement("div");
    table.className = "bw-table";

    worldEl.append(hand, stacksWrap, table);
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
      return;
    }

    const result = execute(parsed);
    deriveState();
    renderWorld();
    renderStateText();

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

  resetWorld();
})();
