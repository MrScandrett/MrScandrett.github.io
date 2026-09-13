const chatLog = document.getElementById("eliza-chat-log");
const form = document.getElementById("eliza-form");
const input = document.getElementById("eliza-input");
const clearButton = document.getElementById("eliza-clear");
const resetButton = document.getElementById("eliza-reset");
const scriptSelect = document.getElementById("eliza-script");
const showWhyToggle = document.getElementById("eliza-show-why");
const typingIndicator = document.getElementById("eliza-typing");
const starters = document.getElementById("eliza-starters");

if (!chatLog || !form || !input || !clearButton || !resetButton || !scriptSelect || !showWhyToggle || !typingIndicator || !starters) {
  throw new Error("ELIZA demo could not initialize. Missing expected DOM elements.");
}

const STORAGE_KEY = "classroomos:eliza1966:v2";

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

const state = {
  name: null,
  topic: null,
  turn: 0,
  script: "DOCTOR",
  showWhy: false,
  transcript: [],
  pendingTimers: [],
  pendingCount: 0
};

const scripts = {
  DOCTOR: {
    welcome: "Please state your problem.",
    scriptLabel: "DOCTOR",
    fallbackReplies: [
      "Please go on.",
      "Tell me more.",
      "Why do you say that?",
      "How does that make you feel?",
      "What comes to mind when you say that?",
      "Can you elaborate on that?"
    ],
    rules: [
      {
        id: "doctor-name",
        keyword: "MY NAME IS",
        template: "PERSONALIZATION",
        pattern: /\bMY NAME IS\s+([A-Z][A-Z '\-]*)/,
        reply(match) {
          state.name = cleanCapture(match[1]);
          return {
            text: `How do you feel today, ${state.name}?`,
            substitutions: []
          };
        }
      },
      {
        id: "doctor-topic",
        keyword: "TOPIC",
        template: "TOPIC SLOT",
        pattern: /\b(?:I WANT TO TALK ABOUT|LET US TALK ABOUT|THE TOPIC IS)\s+(.+)/,
        reply(match) {
          state.topic = cleanCapture(match[1]);
          return {
            text: `We shall discuss ${state.topic}. What about it troubles you?`,
            substitutions: []
          };
        }
      },
      {
        id: "doctor-feel",
        keyword: "I FEEL",
        template: "REFLECTION",
        pattern: /\bI FEEL\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `Do you often feel ${reflected.text}?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "doctor-i-am",
        keyword: "I AM",
        template: "REFLECTION",
        pattern: /\bI AM\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `How long have you been ${reflected.text}?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "doctor-i-think",
        keyword: "I THINK",
        template: "REFLECTION",
        pattern: /\bI THINK\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `What leads you to think ${reflected.text}?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "doctor-because",
        keyword: "BECAUSE",
        template: "REPHRASE",
        pattern: /\bBECAUSE\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `Is ${reflected.text} the real reason?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "doctor-family",
        keyword: "FAMILY",
        template: "CATEGORY PROMPT",
        pattern: /\b(?:MOTHER|FATHER|MOM|DAD|FAMILY)\b/,
        reply() {
          return {
            text: "Tell me more about your family.",
            substitutions: []
          };
        }
      },
      {
        id: "doctor-sorry",
        keyword: "SORRY",
        template: "REASSURANCE",
        pattern: /\b(?:SORRY|APOLOGIZE)\b/,
        reply() {
          return {
            text: "There is no need to apologize.",
            substitutions: []
          };
        }
      },
      {
        id: "doctor-always-never",
        keyword: "ALWAYS/NEVER",
        template: "SPECIFICITY CHECK",
        pattern: /\b(?:ALWAYS|NEVER)\b/,
        reply() {
          return {
            text: "Can you think of a specific example?",
            substitutions: []
          };
        }
      },
      {
        id: "doctor-can-you",
        keyword: "CAN YOU",
        template: "QUESTION REFLECTION",
        pattern: /\bCAN YOU\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `What would it mean if I could ${reflected.text}?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "doctor-why-dont-you",
        keyword: "WHY DON'T YOU",
        template: "QUESTION REFLECTION",
        pattern: /\bWHY DON'T YOU\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `Do you believe I do not ${reflected.text}?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "doctor-yes",
        keyword: "YES",
        template: "CERTAINTY CHECK",
        pattern: /\b(?:YES|YEAH)\b/,
        reply() {
          return {
            text: "You seem quite certain.",
            substitutions: []
          };
        }
      },
      {
        id: "doctor-no",
        keyword: "NO",
        template: "PROBE",
        pattern: /\b(?:NO|NOPE)\b/,
        reply() {
          return {
            text: "Why not?",
            substitutions: []
          };
        }
      },
      {
        id: "doctor-remember",
        keyword: "REMEMBER",
        template: "CONTEXT CALLBACK",
        pattern: /\b(?:REMEMBER|YOU SAID)\b/,
        reply() {
          if (state.topic) {
            return {
              text: `We were discussing ${state.topic}. What about it is most important?`,
              substitutions: []
            };
          }
          return {
            text: "What would you like me to remember?",
            substitutions: []
          };
        }
      },
      {
        id: "doctor-question",
        keyword: "QUESTION",
        template: "QUESTION DEFLECTION",
        pattern: /\?$/,
        reply() {
          return {
            text: "What answer would satisfy you?",
            substitutions: []
          };
        }
      }
    ]
  },
  NEUTRAL: {
    welcome: "Hello. I am a rule-based conversation mirror. Share a thought.",
    scriptLabel: "NEUTRAL",
    fallbackReplies: [
      "I hear you. Say a little more.",
      "That sounds important to you.",
      "Can you give an example?",
      "What part stands out most?",
      "Tell me what happened next.",
      "How would you rephrase that in one sentence?"
    ],
    rules: [
      {
        id: "neutral-name",
        keyword: "MY NAME IS",
        template: "PERSONALIZATION",
        pattern: /\bMY NAME IS\s+([A-Z][A-Z '\-]*)/,
        reply(match) {
          state.name = cleanCapture(match[1]);
          return {
            text: `Nice to meet you, ${state.name}. What would you like to talk about?`,
            substitutions: []
          };
        }
      },
      {
        id: "neutral-topic",
        keyword: "TOPIC",
        template: "TOPIC SLOT",
        pattern: /\b(?:I WANT TO TALK ABOUT|LET US TALK ABOUT|THE TOPIC IS)\s+(.+)/,
        reply(match) {
          state.topic = cleanCapture(match[1]);
          return {
            text: `Topic noted: ${state.topic}. What is the key idea?`,
            substitutions: []
          };
        }
      },
      {
        id: "neutral-feel",
        keyword: "I FEEL",
        template: "REFLECTION",
        pattern: /\bI FEEL\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `You feel ${reflected.text}. What contributes to that feeling?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "neutral-i-am",
        keyword: "I AM",
        template: "REFLECTION",
        pattern: /\bI AM\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `You are ${reflected.text}. What makes you describe it that way?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "neutral-i-think",
        keyword: "I THINK",
        template: "REFLECTION",
        pattern: /\bI THINK\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `You think ${reflected.text}. What evidence supports that?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "neutral-because",
        keyword: "BECAUSE",
        template: "REPHRASE",
        pattern: /\bBECAUSE\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `${capitalizeFirst(reflected.text)} sounds like one reason. Any others?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "neutral-family",
        keyword: "FAMILY",
        template: "CATEGORY PROMPT",
        pattern: /\b(?:MOTHER|FATHER|MOM|DAD|FAMILY|FRIEND|FRIENDS)\b/,
        reply() {
          return {
            text: "People around you seem relevant. What happened with them?",
            substitutions: []
          };
        }
      },
      {
        id: "neutral-always-never",
        keyword: "ALWAYS/NEVER",
        template: "SPECIFICITY CHECK",
        pattern: /\b(?:ALWAYS|NEVER)\b/,
        reply() {
          return {
            text: "Can you describe one specific moment?",
            substitutions: []
          };
        }
      },
      {
        id: "neutral-can-you",
        keyword: "CAN YOU",
        template: "QUESTION REFLECTION",
        pattern: /\bCAN YOU\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `What would change if I could ${reflected.text}?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "neutral-why-dont-you",
        keyword: "WHY DON'T YOU",
        template: "QUESTION REFLECTION",
        pattern: /\bWHY DON'T YOU\s+(.+)/,
        reply(match) {
          const reflected = reflectWithMeta(cleanCapture(match[1]));
          return {
            text: `What makes you ask whether I should ${reflected.text}?`,
            substitutions: reflected.substitutions
          };
        }
      },
      {
        id: "neutral-yes",
        keyword: "YES",
        template: "CERTAINTY CHECK",
        pattern: /\b(?:YES|YEAH)\b/,
        reply() {
          return {
            text: "You sound confident about that.",
            substitutions: []
          };
        }
      },
      {
        id: "neutral-no",
        keyword: "NO",
        template: "PROBE",
        pattern: /\b(?:NO|NOPE)\b/,
        reply() {
          return {
            text: "What makes that a no for you?",
            substitutions: []
          };
        }
      },
      {
        id: "neutral-remember",
        keyword: "REMEMBER",
        template: "CONTEXT CALLBACK",
        pattern: /\b(?:REMEMBER|YOU SAID)\b/,
        reply() {
          if (state.topic) {
            return {
              text: `We were discussing ${state.topic}. What detail should we focus on now?`,
              substitutions: []
            };
          }
          return {
            text: "What would you like to bring back into focus?",
            substitutions: []
          };
        }
      },
      {
        id: "neutral-question",
        keyword: "QUESTION",
        template: "QUESTION DEFLECTION",
        pattern: /\?$/,
        reply() {
          return {
            text: "How would you answer that yourself right now?",
            substitutions: []
          };
        }
      }
    ]
  }
};

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

function capitalizeFirst(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function reflectWithMeta(value) {
  const substitutions = [];
  const reflected = value
    .split(/\b/)
    .map((token) => {
      const replacement = reflections[token];
      if (replacement) {
        substitutions.push({ from: token, to: replacement });
        return replacement;
      }
      return token;
    })
    .join("");
  return { text: reflected, substitutions };
}

function getScriptConfig(scriptName) {
  return scripts[scriptName] || scripts.DOCTOR;
}

function chooseFallback(scriptName) {
  const scriptConfig = getScriptConfig(scriptName);
  if (state.turn % 4 === 0 && state.topic) {
    return {
      text: `Return to ${state.topic}. Why does it matter to you?`,
      debug: {
        matchedKeyword: "NONE",
        ruleId: "fallback-topic",
        template: "FALLBACK",
        substitutions: [],
        fallback: true
      }
    };
  }
  const text = scriptConfig.fallbackReplies[state.turn % scriptConfig.fallbackReplies.length];
  return {
    text,
    debug: {
      matchedKeyword: "NONE",
      ruleId: "fallback-generic",
      template: "FALLBACK",
      substitutions: [],
      fallback: true
    }
  };
}

function generateElizaReply(text, scriptName) {
  const normalized = normalizeInput(text);
  if (!normalized) {
    return {
      replyText: "Please enter a statement.",
      debug: {
        matchedKeyword: "EMPTY_INPUT",
        ruleId: "empty-input",
        template: "VALIDATION",
        substitutions: [],
        fallback: false
      }
    };
  }

  const scriptConfig = getScriptConfig(scriptName);
  for (const rule of scriptConfig.rules) {
    const match = normalized.match(rule.pattern);
    if (!match) continue;
    const result = rule.reply(match);
    return {
      replyText: result.text,
      debug: {
        matchedKeyword: rule.keyword || rule.pattern.source,
        ruleId: rule.id,
        template: rule.template,
        substitutions: result.substitutions || [],
        fallback: false
      }
    };
  }

  const fallback = chooseFallback(scriptName);
  return {
    replyText: fallback.text,
    debug: fallback.debug
  };
}

function saveState() {
  const snapshot = {
    name: state.name,
    topic: state.topic,
    turn: state.turn,
    script: state.script,
    showWhy: state.showWhy,
    transcript: state.transcript
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    state.name = typeof saved.name === "string" ? saved.name : null;
    state.topic = typeof saved.topic === "string" ? saved.topic : null;
    state.turn = Number.isInteger(saved.turn) && saved.turn >= 0 ? saved.turn : 0;
    state.script = saved.script === "NEUTRAL" ? "NEUTRAL" : "DOCTOR";
    state.showWhy = Boolean(saved.showWhy);
    state.transcript = Array.isArray(saved.transcript) ? saved.transcript : [];
    return true;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function setTyping(isTyping) {
  typingIndicator.hidden = !isTyping;
}

function formatSubstitutions(substitutions) {
  if (!substitutions.length) return "None";
  return substitutions.map((item) => `${item.from}->${item.to}`).join(", ");
}

function createWhyPanel(debug) {
  const why = document.createElement("details");
  why.className = "eliza1966-why";
  const summary = document.createElement("summary");
  summary.textContent = "Why this reply?";
  why.appendChild(summary);

  const matched = document.createElement("p");
  matched.textContent = `Matched keyword/pattern: ${debug.fallback ? "Fallback response used." : debug.matchedKeyword}`;
  why.appendChild(matched);

  const template = document.createElement("p");
  template.textContent = `Transformation template: ${debug.template || "N/A"}`;
  why.appendChild(template);

  const substitutions = document.createElement("p");
  substitutions.textContent = `Substitutions: ${formatSubstitutions(debug.substitutions || [])}`;
  why.appendChild(substitutions);

  return why;
}

function appendMessage(role, text, meta = null, shouldSave = true) {
  const message = document.createElement("article");
  message.className = "eliza1966-message";
  message.setAttribute("data-role", role);
  message.setAttribute("tabindex", "0");

  const head = document.createElement("strong");
  head.className = "eliza1966-message-head";
  head.textContent = role;

  const body = document.createElement("p");
  body.className = "eliza1966-message-body";
  body.textContent = text;

  message.appendChild(head);
  message.appendChild(body);

  if (role === "ELIZA" && state.showWhy && meta && meta.debug) {
    message.appendChild(createWhyPanel(meta.debug));
  }

  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;

  if (shouldSave) {
    state.transcript.push({ role, text, meta });
    saveState();
  }
}

function renderTranscript() {
  chatLog.innerHTML = "";
  for (const message of state.transcript) {
    appendMessage(message.role, message.text, message.meta || null, false);
  }
}

function addSystemMessage(text, shouldSave = true) {
  appendMessage("SYSTEM", text, null, shouldSave);
}

function sendMessage(text) {
  const value = text.trim();
  if (!value) return;

  appendMessage("YOU", value);
  state.turn += 1;
  saveState();

  state.pendingCount += 1;
  setTyping(true);
  const timerId = window.setTimeout(() => {
    state.pendingTimers = state.pendingTimers.filter((id) => id !== timerId);
    const result = generateElizaReply(value, state.script);
    appendMessage("ELIZA", result.replyText, { debug: result.debug });
    state.pendingCount = Math.max(0, state.pendingCount - 1);
    if (state.pendingCount === 0) {
      setTyping(false);
    }
  }, 280);
  state.pendingTimers.push(timerId);
}

function clearChat(shouldPersist = true) {
  for (const timerId of state.pendingTimers) {
    clearTimeout(timerId);
  }
  state.pendingTimers = [];
  state.pendingCount = 0;
  setTyping(false);
  state.name = null;
  state.topic = null;
  state.turn = 0;
  state.transcript = [];
  chatLog.innerHTML = "";
  addSystemMessage(`ELIZA ${getScriptConfig(state.script).scriptLabel} script loaded.`, shouldPersist);
  appendMessage("ELIZA", getScriptConfig(state.script).welcome, null, shouldPersist);
  if (shouldPersist) saveState();
}

function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  state.script = "DOCTOR";
  state.showWhy = false;
  scriptSelect.value = state.script;
  showWhyToggle.checked = state.showWhy;
  clearChat(false);
  saveState();
}

function reRenderWhyPanels() {
  renderTranscript();
  saveState();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
  input.value = "";
  input.focus();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

scriptSelect.addEventListener("change", () => {
  state.script = scriptSelect.value === "NEUTRAL" ? "NEUTRAL" : "DOCTOR";
  addSystemMessage(`Script switched to ${getScriptConfig(state.script).scriptLabel}.`);
  saveState();
  input.focus();
});

showWhyToggle.addEventListener("change", () => {
  state.showWhy = showWhyToggle.checked;
  reRenderWhyPanels();
  input.focus();
});

clearButton.addEventListener("click", () => {
  clearChat();
  input.value = "";
  input.focus();
});

resetButton.addEventListener("click", () => {
  resetAll();
  input.value = "";
  input.focus();
});

starters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-prompt]");
  if (!button) return;
  const promptText = button.getAttribute("data-prompt") || "";
  input.value = promptText;
  sendMessage(promptText);
  input.value = "";
  input.focus();
});

function initialize() {
  const restored = loadState();
  scriptSelect.value = state.script;
  showWhyToggle.checked = state.showWhy;

  if (restored && state.transcript.length) {
    renderTranscript();
    setTyping(false);
    return;
  }

  clearChat(false);
  saveState();
}

initialize();
