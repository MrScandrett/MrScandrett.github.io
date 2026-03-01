const chatLog = document.getElementById("eliza-chat-log");
const form = document.getElementById("eliza-form");
const input = document.getElementById("eliza-input");
const resetButton = document.getElementById("eliza-reset");

if (!chatLog || !form || !input || !resetButton) {
  throw new Error("ELIZA demo could not initialize. Missing expected DOM elements.");
}

const state = {
  name: null,
  topic: null,
  turn: 0
};

const reflections = {
  AM: "ARE",
  WAS: "WERE",
  I: "YOU",
  "I'M": "YOU ARE",
  "I'VE": "YOU HAVE",
  "I'LL": "YOU WILL",
  MY: "YOUR",
  ME: "YOU",
  YOU: "I",
  YOUR: "MY",
  YOURS: "MINE"
};

const fallbackReplies = [
  "PLEASE GO ON.",
  "TELL ME MORE.",
  "WHY DO YOU SAY THAT?",
  "HOW DOES THAT MAKE YOU FEEL?",
  "WHAT COMES TO MIND WHEN YOU SAY THAT?",
  "CAN YOU ELABORATE ON THAT?"
];

const rules = [
  {
    pattern: /\bMY NAME IS\s+([A-Z][A-Z '\-]*)/,
    reply(match) {
      state.name = cleanCapture(match[1]);
      return `HOW DO YOU FEEL TODAY, ${state.name}?`;
    }
  },
  {
    pattern: /\b(?:I WANT TO TALK ABOUT|LET US TALK ABOUT|THE TOPIC IS)\s+(.+)/,
    reply(match) {
      state.topic = cleanCapture(match[1]);
      return `WE SHALL DISCUSS ${state.topic}. WHAT ABOUT IT TROUBLES YOU?`;
    }
  },
  {
    pattern: /\bI FEEL\s+(.+)/,
    reply(match) {
      return `DO YOU OFTEN FEEL ${reflect(cleanCapture(match[1]))}?`;
    }
  },
  {
    pattern: /\bI AM\s+(.+)/,
    reply(match) {
      return `HOW LONG HAVE YOU BEEN ${reflect(cleanCapture(match[1]))}?`;
    }
  },
  {
    pattern: /\bI THINK\s+(.+)/,
    reply(match) {
      return `WHAT LEADS YOU TO THINK ${reflect(cleanCapture(match[1]))}?`;
    }
  },
  {
    pattern: /\bBECAUSE\s+(.+)/,
    reply(match) {
      return `IS ${reflect(cleanCapture(match[1]))} THE REAL REASON?`;
    }
  },
  {
    pattern: /\b(?:MOTHER|FATHER|MOM|DAD|FAMILY)\b/,
    reply() {
      return "TELL ME MORE ABOUT YOUR FAMILY.";
    }
  },
  {
    pattern: /\b(?:SORRY|APOLOGIZE)\b/,
    reply() {
      return "THERE IS NO NEED TO APOLOGIZE.";
    }
  },
  {
    pattern: /\b(?:ALWAYS|NEVER)\b/,
    reply() {
      return "CAN YOU THINK OF A SPECIFIC EXAMPLE?";
    }
  },
  {
    pattern: /\bCAN YOU\s+(.+)/,
    reply(match) {
      return `WHAT WOULD IT MEAN IF I COULD ${reflect(cleanCapture(match[1]))}?`;
    }
  },
  {
    pattern: /\bWHY DON'T YOU\s+(.+)/,
    reply(match) {
      return `DO YOU BELIEVE I DO NOT ${reflect(cleanCapture(match[1]))}?`;
    }
  },
  {
    pattern: /\b(?:YES|YEAH)\b/,
    reply() {
      return "YOU SEEM QUITE CERTAIN.";
    }
  },
  {
    pattern: /\b(?:NO|NOPE)\b/,
    reply() {
      return "WHY NOT?";
    }
  },
  {
    pattern: /\b(?:REMEMBER|YOU SAID)\b/,
    reply() {
      if (state.topic) {
        return `WE WERE DISCUSSING ${state.topic}. WHAT ABOUT IT IS MOST IMPORTANT?`;
      }
      return "WHAT WOULD YOU LIKE ME TO REMEMBER?";
    }
  },
  {
    pattern: /\?$/,
    reply() {
      return "WHAT ANSWER WOULD SATISFY YOU?";
    }
  }
];

function cleanCapture(value) {
  return value
    .trim()
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ");
}

function normalizeInput(value) {
  return value
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

function reflect(value) {
  return value
    .split(/\b/)
    .map((token) => reflections[token] || token)
    .join("");
}

function addSystemLine(text) {
  const line = document.createElement("p");
  line.className = "eliza1966-line eliza1966-system";
  line.textContent = text;
  chatLog.appendChild(line);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function addChatLine(speaker, text) {
  const line = document.createElement("p");
  line.className = "eliza1966-line eliza1966-chat";
  line.textContent = `${speaker}> ${text}`;
  chatLog.appendChild(line);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function chooseFallback() {
  if (state.turn % 4 === 0 && state.topic) {
    return `RETURN TO ${state.topic}. WHY DOES IT MATTER TO YOU?`;
  }
  return fallbackReplies[state.turn % fallbackReplies.length];
}

function replyTo(userInput) {
  if (!userInput) return "PLEASE ENTER A STATEMENT.";

  for (const rule of rules) {
    const match = userInput.match(rule.pattern);
    if (match) {
      return rule.reply(match);
    }
  }

  return chooseFallback();
}

function bootTerminal() {
  chatLog.innerHTML = "";
  state.name = null;
  state.topic = null;
  state.turn = 0;

  addSystemLine("ELIZA VERSION 1.0");
  addSystemLine("MIT ARTIFICIAL INTELLIGENCE LABORATORY");
  addSystemLine("1966 DOCTOR SCRIPT LOADED");
  addSystemLine("THIS PROGRAM SIMULATES A 1966 PSYCHOTHERAPY CONVERSATION STYLE. IT IS NOT A REAL THERAPIST AND DOES NOT UNDERSTAND YOU.");
  addSystemLine("");
  addChatLine("ELIZA", "PLEASE STATE YOUR PROBLEM.");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = normalizeInput(input.value);
  if (!message) return;

  addChatLine("YOU", message);
  state.turn += 1;
  addChatLine("ELIZA", replyTo(message));

  input.value = "";
  input.focus();
});

resetButton.addEventListener("click", () => {
  bootTerminal();
  input.value = "";
  input.focus();
});

input.addEventListener("input", () => {
  input.value = input.value.toUpperCase();
});

bootTerminal();
